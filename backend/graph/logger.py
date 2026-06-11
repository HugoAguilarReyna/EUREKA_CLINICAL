import logging
from pythonjsonlogger import jsonlogger

# Configure root logger for EUREKA graph layer
_handler = logging.StreamHandler()
_formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(levelname)s %(name)s %(message)s",
    "%Y-%m-%d %H:%M:%S",
)
_handler.setFormatter(_formatter)

logger = logging.getLogger("eureka.graph")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(_handler)


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the eureka.graph namespace."""
    child = logger.getChild(name)
    return child
