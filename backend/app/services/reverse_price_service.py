from decimal import Decimal
from fastapi import HTTPException, status

from backend.app.core.decimal_utils import (
    round_rupiah,
    round_to_step,
    to_decimal,
)
from backend.app.schemas.common import TargetMode, MarginStatus, FeeBase
from backend.app.schemas.reverse_price import ReversePriceInput, ReversePriceResult
from backend.app.schemas.calculator import MarginCalculationInput
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.repositories.config_repository import config_repo
from backend.app.services.calculator_service import calculator_service


class ReversePriceService:
    def calculate_reverse_price(self, inp: ReversePriceInput) -> ReversePriceResult:
        hpp = inp.hpp
        packaging = inp.packaging_cost

        # Resolve product catalog if product_id provided
        if inp.product_id:
            product = product_repo.get_by_id(inp.product_id)
            if product:
                if hpp is None:
                    hpp = product.hpp
                if packaging == Decimal("0.00") and product.packaging > Decimal("0.00"):
                    packaging = product.packaging

        hpp_final = to_decimal(hpp, Decimal("0.00"))
        packaging_final = to_decimal(packaging, Decimal("0.00"))
        total_cost = round_rupiah(hpp_final + packaging_final)

        # Resolve platform fee preset
        admin_fee_pct = inp.admin_fee_percent
        service_fee_pct = inp.service_fee_percent
        fixed_fee = inp.fixed_fee

        if inp.platform_preset_id:
            plat = platform_repo.get_by_id(inp.platform_preset_id)
            if plat:
                admin_fee_pct = plat.commission_pct
                service_fee_pct = plat.service_pct
                fixed_fee = plat.fixed_fee

        fee_rate = (admin_fee_pct + service_fee_pct) / Decimal("100.00")

        # Guard clause: discount >= 100%
        if inp.planned_discount_percent >= Decimal("100.00"):
            raise HTTPException(
                status_code=422,
                detail="Rencana diskon tidak boleh mencapai atau melebihi 100%.",
            )

        # Guard clause: fee + target margin >= 100%
        if inp.target_mode == TargetMode.PERCENT:
            target_margin_rate = inp.target_value / Decimal("100.00")
            if (fee_rate + target_margin_rate) >= Decimal("1.00"):
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Kombinasi potongan platform ({admin_fee_pct + service_fee_pct:.2f}%) "
                        f"dan target margin ({inp.target_value:.2f}%) mencapai atau melebihi 100% (tidak mungkin menghasilkan harga positif)."
                    ),
                )
            denom = Decimal("1.00") - fee_rate - target_margin_rate
            recommended_final_price = round_rupiah((total_cost + fixed_fee) / denom)
        else:
            # NOMINAL target profit
            if fee_rate >= Decimal("1.00"):
                raise HTTPException(
                    status_code=422,
                    detail=f"Total potongan platform ({admin_fee_pct + service_fee_pct:.2f}%) tidak boleh mencapai 100%.",
                )
            denom = Decimal("1.00") - fee_rate
            recommended_final_price = round_rupiah((total_cost + fixed_fee + inp.target_value) / denom)

        # Calculate base strikethrough price if planned discount is set
        discount_rate = inp.planned_discount_percent / Decimal("100.00")
        if discount_rate > Decimal("0.00"):
            recommended_base_price = round_rupiah(recommended_final_price / (Decimal("1.00") - discount_rate))
        else:
            recommended_base_price = recommended_final_price

        # Round to setting's rounding step (e.g. 500)
        cfg = config_repo.get_config()
        rounded_base_price = round_to_step(recommended_base_price, cfg.rounding_step)

        planned_discount_nominal = round_rupiah(recommended_base_price - recommended_final_price)

        # Run verification margin check on calculated prices
        verification = calculator_service.calculate_margin(
            MarginCalculationInput(
                hpp=hpp_final,
                selling_price=recommended_base_price,
                discount_percent=inp.planned_discount_percent,
                discount_nominal=Decimal("0.00"),
                packaging_cost=packaging_final,
                platform_preset_id=inp.platform_preset_id,
                admin_fee_percent=admin_fee_pct,
                service_fee_percent=service_fee_pct,
                fixed_fee=fixed_fee,
                fee_base=FeeBase.AFTER_DISCOUNT,
            )
        )

        return ReversePriceResult(
            recommended_final_price=recommended_final_price,
            recommended_base_price=recommended_base_price,
            rounded_base_price=rounded_base_price,
            planned_discount_percent=inp.planned_discount_percent,
            planned_discount_nominal=planned_discount_nominal,
            max_safe_discount_percent=verification.max_safe_discount_percent,
            projected_net_revenue=verification.net_revenue,
            projected_net_profit=verification.net_profit,
            projected_margin_percent=verification.margin_percent,
            fees=verification.fees,
            status=verification.status,
        )


reverse_price_service = ReversePriceService()
