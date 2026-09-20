from pathlib import Path
import random
import joblib
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = Path(__file__).parent / "wait_model.joblib"


def train_model():
    random.seed(42)
    X = []
    y = []

    for _ in range(800):
        patients_ahead = random.randint(0, 25)
        queue_length = random.randint(0, 35)
        doctors_available = random.randint(1, 6)
        avg_consultation = random.randint(5, 20)
        priority = random.choice([0, 1, 2])  # normal, urgent, emergency

        wait = (
            patients_ahead * avg_consultation / doctors_available
            + queue_length * 0.6
            - priority * 8
            + random.uniform(-4, 4)
        )
        wait = max(0, wait)

        X.append([
            patients_ahead,
            queue_length,
            doctors_available,
            avg_consultation,
            priority,
        ])
        y.append(wait)

    model = RandomForestRegressor(
        n_estimators=120,
        random_state=42,
    )
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    return model


def get_model():
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    return train_model()


def predict_wait(
    patients_ahead: int,
    queue_length: int,
    doctors_available: int,
    avg_consultation: int,
    priority: str,
) -> int:
    priority_value = {
        "NORMAL": 0,
        "URGENT": 1,
        "EMERGENCY": 2,
    }.get(priority.upper(), 0)

    model = get_model()

    prediction = model.predict([[
        patients_ahead,
        queue_length,
        max(1, doctors_available),
        avg_consultation,
        priority_value,
    ]])[0]

    return max(0, round(float(prediction)))
