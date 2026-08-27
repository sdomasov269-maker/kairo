from pathlib import Path

from dotenv import load_dotenv


def load_provider_environment(root: Path | None = None) -> None:
    repository_root = root or Path(__file__).resolve().parents[2]
    load_dotenv(repository_root / ".env.local", override=False)
    load_dotenv(repository_root / ".env", override=False)
