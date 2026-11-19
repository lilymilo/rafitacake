from fastapi import APIRouter
from backend.app.core.responses import success_response
from backend.app.schemas.reverse_price import ReversePriceInput
from backend.app.services.reverse_price_service import reverse_price_service

router = APIRouter(prefix="/reverse-price", tags=["ReversePrice Planner"])


@router.post("/calculate")
def calculate_reverse_price(payload: ReversePriceInput):
    result = reverse_price_service.calculate_reverse_price(payload)
    return success_response(
        data=result.model_dump(),
        message="Rekomendasi harga jual balik berhasil dihitung.",
    )
