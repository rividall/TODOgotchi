import pytest


async def _register(client, suffix: str = "") -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"cl{suffix}@example.com",
            "username": f"cl{suffix}",
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


@pytest.mark.asyncio
async def test_add_checklist_item_awards_3_xp(client):
    token = await _register(client)
    pid = await _create_poring(client, token)

    response = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "Book flights"},
        headers=_auth(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["text"] == "Book flights"
    assert body["completed"] is False
    assert body["order"] == 0

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["xp"] == 3
    assert len(poring.json()["checklist"]) == 1


@pytest.mark.asyncio
async def test_order_increments_across_items(client):
    token = await _register(client)
    pid = await _create_poring(client, token)

    first = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "a"},
        headers=_auth(token),
    )
    second = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "b"},
        headers=_auth(token),
    )
    assert first.json()["order"] == 0
    assert second.json()["order"] == 1


@pytest.mark.asyncio
async def test_complete_item_awards_5_xp_once(client):
    token = await _register(client)
    pid = await _create_poring(client, token)

    created = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "ship"},
        headers=_auth(token),
    )
    item_id = created.json()["id"]

    # First complete transition: +5
    first = await client.patch(
        f"/api/v1/porings/{pid}/checklist/{item_id}",
        json={"completed": True},
        headers=_auth(token),
    )
    assert first.status_code == 200
    assert first.json()["completed"] is True

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["xp"] == 3 + 5

    # PATCH with completed=True again: no extra XP
    second = await client.patch(
        f"/api/v1/porings/{pid}/checklist/{item_id}",
        json={"completed": True},
        headers=_auth(token),
    )
    assert second.status_code == 200

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["xp"] == 3 + 5


@pytest.mark.asyncio
async def test_unchecking_and_recompleting_awards_xp_again(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    created = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "re-do"},
        headers=_auth(token),
    )
    item_id = created.json()["id"]

    await client.patch(
        f"/api/v1/porings/{pid}/checklist/{item_id}",
        json={"completed": True},
        headers=_auth(token),
    )
    await client.patch(
        f"/api/v1/porings/{pid}/checklist/{item_id}",
        json={"completed": False},
        headers=_auth(token),
    )
    await client.patch(
        f"/api/v1/porings/{pid}/checklist/{item_id}",
        json={"completed": True},
        headers=_auth(token),
    )

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    # +3 (added) + 5 (first complete) + 5 (second complete)
    assert poring.json()["xp"] == 3 + 5 + 5


@pytest.mark.asyncio
async def test_delete_checklist_item(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    created = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "delete me"},
        headers=_auth(token),
    )
    item_id = created.json()["id"]

    delete = await client.delete(
        f"/api/v1/porings/{pid}/checklist/{item_id}", headers=_auth(token)
    )
    assert delete.status_code == 204

    poring = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert poring.json()["checklist"] == []


@pytest.mark.asyncio
async def test_checklist_on_other_users_poring_is_forbidden(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    pid = await _create_poring(client, alice)

    response = await client.post(
        f"/api/v1/porings/{pid}/checklist",
        json={"text": "sneaky"},
        headers=_auth(bob),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_checklist_returns_items_in_order(client):
    token = await _register(client)
    pid = await _create_poring(client, token)
    for text in ["first", "second", "third"]:
        await client.post(
            f"/api/v1/porings/{pid}/checklist",
            json={"text": text},
            headers=_auth(token),
        )

    response = await client.get(f"/api/v1/porings/{pid}/checklist", headers=_auth(token))
    assert response.status_code == 200
    items = response.json()
    assert [i["text"] for i in items] == ["first", "second", "third"]
    assert [i["order"] for i in items] == [0, 1, 2]
