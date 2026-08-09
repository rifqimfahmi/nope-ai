from phoenix.otel import register

from app.config import Settings


def configure_tracing(settings: Settings) -> None:
    """Send OTel traces/metrics for the agent to Phoenix, if configured."""
    if not settings.phoenix_collector_endpoint:
        return

    register(
        project_name=settings.phoenix_project_name,
        endpoint=settings.phoenix_collector_endpoint,
        auto_instrument=True,
        set_global_tracer_provider=True,
        batch=True,
    )
