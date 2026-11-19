from decimal import Decimal
from threading import Lock
from backend.app.schemas.config import MarginConfigResponse, MarginConfigUpdate


class ConfigRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._target_min_margin_percent = Decimal("35.00")
        self._target_max_margin_percent = Decimal("50.00")
        self._rounding_step = Decimal("500")

    def get_config(self) -> MarginConfigResponse:
        with self._lock:
            return MarginConfigResponse(
                target_min_margin_percent=self._target_min_margin_percent,
                target_max_margin_percent=self._target_max_margin_percent,
                rounding_step=self._rounding_step,
            )

    def update_config(self, update: MarginConfigUpdate) -> MarginConfigResponse:
        with self._lock:
            if update.target_min_margin_percent is not None:
                self._target_min_margin_percent = update.target_min_margin_percent
            if update.target_max_margin_percent is not None:
                self._target_max_margin_percent = update.target_max_margin_percent
            if update.rounding_step is not None:
                self._rounding_step = update.rounding_step
            return MarginConfigResponse(
                target_min_margin_percent=self._target_min_margin_percent,
                target_max_margin_percent=self._target_max_margin_percent,
                rounding_step=self._rounding_step,
            )


config_repo = ConfigRepository()
