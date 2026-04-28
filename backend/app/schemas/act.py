from typing import Literal

from pydantic import BaseModel

ActionTypeLiteral = Literal["shipped", "booked", "bought", "done", "abandoned"]


class ActRequest(BaseModel):
    action_type: ActionTypeLiteral
