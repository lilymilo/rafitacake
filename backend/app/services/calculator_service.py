from decimal import Decimal
from typing import Optional, List

from backend.app.core.decimal_utils import (
    round_rupiah,
    safe_percentage,
    safe_divide,
    to_decimal,
)
from backend.app.schemas.common import MarginStatus, FeeBase
from backend.app.schemas.calculator import (
    MarginCalculationInput,
    MarginResult,
    FeeBreakdown,
    MultiPlatformCalculationResult,
    MultiPlatformItemResult,
    SliderCurveInput,
    SliderCurvePoint,
    SliderCurveResult,
)
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.repositories.config_repository import config_repo


class CalculatorService:
    def calculate_margin(self, inp: MarginCalculationInput) -> MarginResult:
        # Resolve HPP & Packaging from product catalog if product_id is specified
        hpp = inp.hpp
        packaging = inp.packaging_cost
        selling_price = inp.selling_price

        if inp.product_id:
            product = product_repo.get_by_id(inp.product_id)
            if product:
                if hpp is None:
                    hpp = product.hpp
                if packaging == Decimal("0.00") and product.packaging > Decimal("0.00"):
                    packaging = product.packaging

        hpp_final = to_decimal(hpp, Decimal("0.00"))
        packaging_final = to_decimal(packaging, Decimal("0.00"))

        # Resolve platform fee preset
        admin_fee_pct = inp.admin_fee_percent
        service_fee_pct = inp.service_fee_percent
        fixed_fee = inp.fixed_fee
        fee_base = inp.fee_base

        if inp.platform_preset_id:
            plat = platform_repo.get_by_id(inp.platform_preset_id)
            if plat:
                admin_fee_pct = plat.commission_pct
                service_fee_pct = plat.service_pct
                fixed_fee = plat.fixed_fee
                fee_base = plat.fee_base

        # Calculate discount
        discount_from_pct = round_rupiah(selling_price * (inp.discount_percent / Decimal("100.00")))
        total_discount_nominal = round_rupiah(discount_from_pct + inp.discount_nominal)
        total_discount_nominal = min(total_discount_nominal, selling_price)
        price_after_discount = max(Decimal("0.00"), selling_price - total_discount_nominal)

        # Base for percentage fees
        if fee_base == FeeBase.BEFORE_DISCOUNT:
            fee_base_amount = selling_price
        else:
            fee_base_amount = price_after_discount

        admin_fee = round_rupiah(fee_base_amount * (admin_fee_pct / Decimal("100.00")))
        service_fee = round_rupiah(fee_base_amount * (service_fee_pct / Decimal("100.00")))
        total_platform_fees = round_rupiah(admin_fee + service_fee + fixed_fee)

        total_cost = round_rupiah(hpp_final + packaging_final)
        net_revenue = round_rupiah(price_after_discount - total_platform_fees)
        net_profit = round_rupiah(net_revenue - total_cost)

        margin_percent = safe_percentage(net_profit, price_after_discount)
        markup_percent = safe_percentage(net_profit, total_cost) if total_cost > Decimal("0") else None

        # Margin Alert thresholds
        cfg = config_repo.get_config()
        min_safe = cfg.target_min_margin_percent
        max_safe = cfg.target_max_margin_percent

        if net_profit <= Decimal("0.00") or margin_percent < min_safe:
            status = MarginStatus.DANGER
            target_min_profit = round_rupiah(price_after_discount * (min_safe / Decimal("100.00")))
            profit_shortfall = max(Decimal("0.00"), round_rupiah(target_min_profit - net_profit))
            if net_profit <= Decimal("0.00"):
                alert_message = f"DANGER: Transaksi berpotensi RUGI bersih Rp {abs(net_profit):,.0f}. Margin {margin_percent:.2f}%."
            else:
                alert_message = (
                    f"DANGER: Margin ({margin_percent:.2f}%) di bawah batas aman ({min_safe:.1f}%). "
                    f"Kekurangan laba Rp {profit_shortfall:,.0f}."
                )
        elif margin_percent <= max_safe:
            status = MarginStatus.SAFE
            profit_shortfall = Decimal("0.00")
            alert_message = f"SAFE: Margin ({margin_percent:.2f}%) berada di batas aman sehat ({min_safe:.1f}% - {max_safe:.1f}%)."
        else:
            status = MarginStatus.OPTIMAL
            profit_shortfall = Decimal("0.00")
            alert_message = f"OPTIMAL: Margin ({margin_percent:.2f}%) berada di atas target maksimal ({max_safe:.1f}%)."

        # Max safe discount calculation
        rate_fee = (admin_fee_pct + service_fee_pct) / Decimal("100.00")
        target_margin_rate = min_safe / Decimal("100.00")
        denom = Decimal("1.00") - rate_fee - target_margin_rate

        if denom <= Decimal("0.00"):
            max_safe_discount_percent = Decimal("0.00")
            max_safe_discount_nominal = Decimal("0.00")
            minimum_required_price = Decimal("0.00")
        else:
            min_req_price = round_rupiah((total_cost + fixed_fee) / denom)
            minimum_required_price = min_req_price
            if selling_price < min_req_price:
                max_safe_discount_percent = Decimal("0.00")
                max_safe_discount_nominal = Decimal("0.00")
            else:
                max_safe_discount_nominal = round_rupiah(selling_price - min_req_price)
                max_safe_discount_percent = safe_percentage(max_safe_discount_nominal, selling_price)

        return MarginResult(
            selling_price=selling_price,
            total_discount_nominal=total_discount_nominal,
            price_after_discount=price_after_discount,
            fees=FeeBreakdown(
                fee_base_amount=fee_base_amount,
                admin_fee=admin_fee,
                service_fee=service_fee,
                fixed_fee=fixed_fee,
                total_platform_fees=total_platform_fees,
            ),
            total_platform_fees=total_platform_fees,
            total_cost=total_cost,
            net_revenue=net_revenue,
            net_profit=net_profit,
            margin_percent=margin_percent,
            markup_percent=markup_percent,
            status=status,
            alert_message=alert_message,
            profit_shortfall=profit_shortfall,
            max_safe_discount_percent=max_safe_discount_percent,
            max_safe_discount_nominal=max_safe_discount_nominal,
            minimum_required_price=minimum_required_price,
        )

    def calculate_multi_platform(self, inp: MarginCalculationInput) -> MultiPlatformCalculationResult:
        platforms = platform_repo.list_all()
        results: List[MultiPlatformItemResult] = []

        # Reference price after discount
        base_res = self.calculate_margin(inp)

        for plat in platforms:
            plat_input = inp.model_copy(update={
                "platform_preset_id": plat.id,
                "admin_fee_percent": plat.commission_pct,
                "service_fee_percent": plat.service_pct,
                "fixed_fee": plat.fixed_fee,
                "fee_base": plat.fee_base,
            })
            res = self.calculate_margin(plat_input)
            results.append(
                MultiPlatformItemResult(
                    platform_id=plat.id,
                    platform_name=plat.name,
                    admin_fee_percent=plat.commission_pct,
                    service_fee_percent=plat.service_pct,
                    fixed_fee=plat.fixed_fee,
                    total_platform_fees=res.total_platform_fees,
                    net_revenue=res.net_revenue,
                    net_profit=res.net_profit,
                    margin_percent=res.margin_percent,
                    status=res.status,
                    alert_message=res.alert_message,
                )
            )

        # Sort descending by margin_percent
        results.sort(key=lambda x: x.margin_percent, reverse=True)

        return MultiPlatformCalculationResult(
            selling_price=base_res.selling_price,
            price_after_discount=base_res.price_after_discount,
            hpp=to_decimal(inp.hpp, Decimal("0.00")),
            packaging_cost=to_decimal(inp.packaging_cost, Decimal("0.00")),
            platforms=results,
        )

    def calculate_slider_curve(self, inp: SliderCurveInput) -> SliderCurveResult:
        current_disc = inp.min_discount
        step = max(Decimal("0.5"), inp.step)
        points: List[SliderCurvePoint] = []

        while current_disc <= inp.max_discount:
            calc_input = MarginCalculationInput(
                hpp=inp.hpp,
                product_id=inp.product_id,
                selling_price=inp.selling_price,
                discount_percent=current_disc,
                discount_nominal=Decimal("0.00"),
                packaging_cost=inp.packaging_cost,
                platform_preset_id=inp.platform_preset_id,
                admin_fee_percent=inp.admin_fee_percent,
                service_fee_percent=inp.service_fee_percent,
                fixed_fee=inp.fixed_fee,
                fee_base=inp.fee_base,
            )
            res = self.calculate_margin(calc_input)
            points.append(
                SliderCurvePoint(
                    discount_percent=current_disc,
                    price_after_discount=res.price_after_discount,
                    net_revenue=res.net_revenue,
                    net_profit=res.net_profit,
                    margin_percent=res.margin_percent,
                    status=res.status,
                    is_danger=(res.status == MarginStatus.DANGER),
                )
            )
            current_disc += step

        # Get baseline for max safe discount
        base_calc = MarginCalculationInput(
            hpp=inp.hpp,
            product_id=inp.product_id,
            selling_price=inp.selling_price,
            packaging_cost=inp.packaging_cost,
            platform_preset_id=inp.platform_preset_id,
            admin_fee_percent=inp.admin_fee_percent,
            service_fee_percent=inp.service_fee_percent,
            fixed_fee=inp.fixed_fee,
            fee_base=inp.fee_base,
        )
        base_res = self.calculate_margin(base_calc)

        return SliderCurveResult(
            points=points,
            max_safe_discount_percent=base_res.max_safe_discount_percent,
            minimum_required_price=base_res.minimum_required_price,
        )


calculator_service = CalculatorService()
