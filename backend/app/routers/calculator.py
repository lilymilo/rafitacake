from fastapi import APIRouter
from backend.app.core.responses import success_response
from backend.app.schemas.calculator import (
    MarginCalculationInput,
    SliderCurveInput,
)
from backend.app.services.calculator_service import calculator_service

router = APIRouter(prefix="/calculator", tags=["SmartMargin Calculator"])


@router.post("/margin")
def calculate_margin(payload: MarginCalculationInput):
    result = calculator_service.calculate_margin(payload)
    return success_response(
        data=result.model_dump(),
        message="Kalkulasi margin berhasil dihitung.",
    )


@router.post("/multi-platform")
def calculate_multi_platform(payload: MarginCalculationInput):
    result = calculator_service.calculate_multi_platform(payload)
    return success_response(
        data=result.model_dump(),
        message="Simulasi perbandingan multi-platform berhasil dihitung.",
    )


@router.post("/slider")
def calculate_slider(payload: MarginCalculationInput):
    result = calculator_service.calculate_margin(payload)
    return success_response(
        data=result.model_dump(),
        message="Kalkulasi slider instan selesai.",
    )


@router.post("/slider-curve")
def calculate_slider_curve(payload: SliderCurveInput):
    result = calculator_service.calculate_slider_curve(payload)
    return success_response(
        data=result.model_dump(),
        message="Kurva simulasi diskon berhasil di-generate.",
    )


@router.post("/max-discount")
def calculate_max_discount(payload: MarginCalculationInput):
    result = calculator_service.calculate_margin(payload)
    return success_response(
        data={
            "selling_price": result.selling_price,
            "max_safe_discount_percent": result.max_safe_discount_percent,
            "max_safe_discount_nominal": result.max_safe_discount_nominal,
            "minimum_required_price": result.minimum_required_price,
            "current_status": result.status,
            "alert_message": result.alert_message,
        },
        message="Rekomendasi batas maksimal diskon aman berhasil dihitung.",
    )
