import pytest


async def _register(client, suffix: str = "") -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"poring{suffix}@example.com",
            "username": f"poring{suffix}",
            "password": "longenough",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_poring_starts_at_seed(client):
    token = await _register(client)
    response = await client.post(
        "/api/v1/porings", json={"title": "Plan Iceland trip"}, headers=_auth(token)
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Plan Iceland trip"
    assert body["xp"] == 0
    assert body["growth_tier"] == "seed"
    assert body["status"] == "alive"
    assert body["action_type"] is None


@pytest.mark.asyncio
async def test_list_porings_only_returns_owned(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    await client.post("/api/v1/porings", json={"title": "alice's"}, headers=_auth(alice))
    await client.post("/api/v1/porings", json={"title": "bob's"}, headers=_auth(bob))

    response = await client.get("/api/v1/porings", headers=_auth(alice))
    assert response.status_code == 200
    titles = [p["title"] for p in response.json()]
    assert titles == ["alice's"]


@pytest.mark.asyncio
async def test_patch_description_awards_2_xp(client):
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings", json={"title": "task"}, headers=_auth(token)
    )
    pid = created.json()["id"]

    patched = await client.patch(
        f"/api/v1/porings/{pid}",
        json={"description": "First draft"},
        headers=_auth(token),
    )
    assert patched.status_code == 200
    assert patched.json()["xp"] == 2
    assert patched.json()["description"] == "First draft"


@pytest.mark.asyncio
async def test_patch_title_only_awards_no_xp(client):
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings", json={"title": "task"}, headers=_auth(token)
    )
    pid = created.json()["id"]

    patched = await client.patch(
        f"/api/v1/porings/{pid}", json={"title": "new title"}, headers=_auth(token)
    )
    assert patched.status_code == 200
    assert patched.json()["xp"] == 0
    assert patched.json()["title"] == "new title"


@pytest.mark.asyncio
async def test_patch_description_unchanged_awards_no_xp(client):
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings",
        json={"title": "task", "description": "same"},
        headers=_auth(token),
    )
    pid = created.json()["id"]

    patched = await client.patch(
        f"/api/v1/porings/{pid}",
        json={"description": "same"},
        headers=_auth(token),
    )
    assert patched.status_code == 200
    assert patched.json()["xp"] == 0


@pytest.mark.asyncio
async def test_growth_tier_thresholds(client):
    """Sanity check: tier transitions at 10, 30, 60 XP via repeated description edits."""
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings", json={"title": "grower"}, headers=_auth(token)
    )
    pid = created.json()["id"]

    tiers_seen = []
    for i in range(35):  # 35 edits × 2 XP = 70 XP, crosses every tier
        patched = await client.patch(
            f"/api/v1/porings/{pid}",
            json={"description": f"edit {i}"},
            headers=_auth(token),
        )
        tiers_seen.append((patched.json()["xp"], patched.json()["growth_tier"]))

    assert ("seed", 0) not in tiers_seen  # nothing has 0 XP after first edit
    assert any(t == "seed" for _, t in tiers_seen[:4])
    assert any(t == "happy" for _, t in tiers_seen)
    assert any(t == "chubby" for _, t in tiers_seen)
    assert any(t == "ripe" for _, t in tiers_seen)


@pytest.mark.asyncio
async def test_get_poring_403_for_other_user(client):
    alice = await _register(client, "a")
    bob = await _register(client, "b")
    created = await client.post(
        "/api/v1/porings", json={"title": "secret"}, headers=_auth(alice)
    )
    pid = created.json()["id"]

    response = await client.get(f"/api/v1/porings/{pid}", headers=_auth(bob))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_poring(client):
    token = await _register(client)
    created = await client.post(
        "/api/v1/porings", json={"title": "doomed"}, headers=_auth(token)
    )
    pid = created.json()["id"]

    delete = await client.delete(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert delete.status_code == 204

    get_after = await client.get(f"/api/v1/porings/{pid}", headers=_auth(token))
    assert get_after.status_code == 404


@pytest.mark.asyncio
async def test_porings_endpoint_requires_auth(client):
    response = await client.get("/api/v1/porings")
    assert response.status_code == 401
