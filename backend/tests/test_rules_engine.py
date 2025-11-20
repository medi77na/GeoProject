from backend.models import KPIResult, SimulationResponse
from backend.services.rules_engine import generate_recommendations


def make_simulation(traffic, pollution, time_step_minutes=60):
    length = len(next(iter(traffic.values())))
    time = [idx * time_step_minutes for idx in range(length)]
    zones = list(traffic.keys())
    return SimulationResponse(
        scenario="A",
        zones=zones,
        time=time,
        traffic=traffic,
        pollution=pollution,
    )


def test_recommendations_critical_pm25_uses_kpis():
    sim = make_simulation(
        traffic={"Zone": [0.5, 0.52, 0.5]},
        pollution={"Zone": [60.0, 62.0, 58.0]},
    )
    kpis = KPIResult(
        scenario="A",
        zones=["Zone"],
        traffic_index={"Zone": 0.5},
        pollution_avg={"Zone": 60.0},
        pollution_max={"Zone": 62.0},
        congestion_index={"Zone": 0.4},
    )

    result = generate_recommendations(simulation=sim, kpis=kpis, wind_speed=1.0)

    codes = {rec.code for rec in result.recommendations}
    assert result.severity == "critical"
    assert "ENV_ALERT" in codes
    assert "FREIGHT_RESTRICTION" in codes
    assert "PICO_PLACA_EXTENDED" in codes
    assert result.kpi_summary["pm25_max"] >= 62.0


def test_recommendations_moderate_pm25():
    sim = make_simulation(
        traffic={"Zone": [0.4, 0.45, 0.42]},
        pollution={"Zone": [25.0, 27.0, 24.0]},
    )

    result = generate_recommendations(simulation=sim)

    codes = {rec.code for rec in result.recommendations}
    assert result.severity == "moderate"
    assert "MOBILITY_ADJUSTMENTS" in codes
    assert "INFORMATION_CAMPAIGN" in codes


def test_recommendations_high_congestion_focuses_on_flow():
    sim = make_simulation(
        traffic={"Zone": [0.82, 0.85, 0.88]},
        pollution={"Zone": [18.0, 19.0, 18.5]},
    )

    result = generate_recommendations(simulation=sim)

    codes = {rec.code for rec in result.recommendations}
    assert result.severity in {"high", "critical"}
    assert any(code.startswith("CONGESTION_REDIRECT") for code in codes)
    assert any(code.startswith("SIGNAL_TIMING") for code in codes)


def test_recommendations_combined_high_pm25_and_congestion():
    sim = make_simulation(
        traffic={"Zone": [0.85, 0.9, 0.88]},
        pollution={"Zone": [40.0, 42.0, 41.0]},
    )

    result = generate_recommendations(simulation=sim)

    codes = {rec.code for rec in result.recommendations}
    assert result.severity == "critical"
    assert any(code.startswith("PICO_PLACA_STRONG") for code in codes)
    assert any(code.startswith("CONGESTION_REDIRECT") for code in codes)
