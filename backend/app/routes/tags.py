"""Tags endpoint."""

from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user

router = APIRouter()


@router.get("/api/tags")
def tags(user: Optional[str] = Depends(get_current_user)):
    """Lista todas as tags únicas do journal com contagem de transações."""
    import main

    raw = main.hledger("tags", output_format="text")
    tag_names = [line.strip() for line in raw.split("\n") if line.strip()]

    result = []
    for tag_name in tag_names:
        count_raw = main.hledger("print", f"tag:{tag_name}", output_format="text")
        count = len([l for l in count_raw.split("\n") if l.strip() and l[0:1].isdigit()])
        result.append({"tag": tag_name, "count": count})

    result.sort(key=lambda t: t["count"], reverse=True)
    return {"tags": result}
