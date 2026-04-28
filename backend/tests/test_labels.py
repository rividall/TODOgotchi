import pytest


async def _register(client, suffix: str = "") -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"lbl{suffix}@example.com",
            "username": f"lbl{suffix}",
            "password": "longenough",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_poring(client, token: str) -> int:
    response = await client.post(
        "/api/v1/porings", json={"title": "task"}, headers=_auth(token)
    )
    return response.json()["id"]


async def _create_label(client, token: str, name: str = "Software") -> int:
    response = await client.post(
        "/api/v1/labels", json={"name": name, "color": "#FF6B6B"}, headers=_auth(token)
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_label_and_list_own(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    await _create_label(client, alice, "Software")
    await _create_label(client, bob, "Travel")

    response = await client.get("/api/v1/labels", headers=_auth(alice))
    names = [l["name"] for l in response.json()]
    assert names == ["Software"]


@pytest.mark.asyncio
async def test_create_label_duplicate_name_conflicts(client):
    token = await _register(client)
    await _create_label(client, token, "Work")
    response = await client.post(
        "/api/v1/labels", json={"name": "Work", "color": "#123456"}, headers=_auth(token)
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_invalid_color_rejected(client):
    token = await _register(client)
    response = await client.post(
        "/api/v1/labels",
        json={"name": "BadColor", "color": "red"},
        headers=_auth(token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_attach_label_awards_3_xp(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    lid = await _create_label(client, token)

    response = await client.post(
        f"/api/v1/porings/{pid}/labels/{lid}", headers=_auth(token)
    )
    assert response.status_code == 201

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    body = poring.json()
    assert body["xp"] == 3
    assert [l["name"] for l in body["labels"]] == ["Software"]


@pytest.mark.asyncio
async def test_attach_label_twice_is_idempotent_no_extra_xp(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    lid = await _create_label(client, token)

    await client.post(f"/api/v1/porings/{pid}/labels/{lid}", headers=_auth(token))
    await client.post(f"/api/v1/porings/{pid}/labels/{lid}", headers=_auth(token))

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["xp"] == 3


@pytest.mark.asyncio
async def test_detach_label_no_xp_change(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    lid = await _create_label(client, token)
    await client.post(f"/api/v1/porings/{pid}/labels/{lid}", headers=_auth(token))

    response = await client.delete(
        f"/api/v1/porings/{pid}/labels/{lid}", headers=_auth(token)
    )
    assert response.status_code == 204

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["labels"] == []
    assert poring.json()["xp"] == 3  # detach does not revoke earned XP


@pytest.mark.asyncio
async def test_cannot_attach_other_users_label(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    bob_pid = await _create_poring(client, bob)
    alice_lid = await _create_label(client, alice)

    response = await client.post(
        f"/api/v1/porings/{bob_pid}/labels/{alice_lid}", headers=_auth(bob)
    )
    assert response.status_code == 403
