import pytest


async def _register(client, suffix: str = "") -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"act{suffix}@example.com",
            "username": f"act{suffix}",
            "password": "longenough",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_ripe_poring(client, token: str) -> int:
    created = await client.post(
        "/api/v1/porings", json={"title": "mature task"}, headers=_auth(token)
    )
    pid = created.json()["id"]
    # 30 description edits × 2 XP = 60 XP → Ripe
    for i in range(30):
        await client.patch(
            f"/api/v1/porings/{pid}",
            json={"description": f"edit {i}"},
            headers=_auth(token),
        )
    return pid


@pytest.mark.asyncio
async def test_act_on_ripe_poring_succeeds(client):
    token = await _register(client)
    pid = await _create_ripe_poring(client, token)

    response = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "shipped"},
        headers=_auth(token),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["action_type"] == "shipped"
    assert body["growth_tier"] == "ripe"


@pytest.mark.asyncio
async def test_act_before_ripe_rejected(client):
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings", json={"title": "too young"}, headers=_auth(token)
    )
    pid = created.json()["id"]

    response = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "done"},
        headers=_auth(token),
    )
    assert response.status_code == 400
    assert "ripe" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_act_twice(client):
    token = await _register(client)
    pid = await _create_ripe_poring(client, token)
    first = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "shipped"},
        headers=_auth(token),
    )
    assert first.status_code == 200

    second = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "done"},
        headers=_auth(token),
    )
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_completed_poring_rejects_xp_events(client):
    """Regression: after act, description edits must not award XP."""
    token = await _register(client)
    pid = await _create_ripe_poring(client, token)
    await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "shipped"},
        headers=_auth(token),
    )

    response = await client.patch(
        f"/api/v1/porings/{pid}",
        json={"description": "post-mortem edit"},
        headers=_auth(token),
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_act_on_other_users_poring_forbidden(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    pid = await _create_ripe_poring(client, alice)

    response = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "shipped"},
        headers=_auth(bob),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_invalid_action_type_rejected(client):
    token = await _register(client)
    pid = await _create_ripe_poring(client, token)
    response = await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "teleported"},
        headers=_auth(token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_completed_porings_still_in_list(client):
    token = await _register(client)
    pid = await _create_ripe_poring(client, token)
    await client.post(
        f"/api/v1/porings/{pid}/act",
        json={"action_type": "done"},
        headers=_auth(token),
    )

    response = await client.get("/api/v1/porings", headers=_auth(token))
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "completed"
    assert body[0]["action_type"] == "done"
