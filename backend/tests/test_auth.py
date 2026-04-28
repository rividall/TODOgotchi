import pytest


@pytest.mark.asyncio
async def test_register_returns_token_pair(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "a@example.com", "username": "alice", "password": "longenough"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email_conflicts(client):
    payload = {"email": "dup@example.com", "username": "dup1", "password": "longenough"}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "username": "dup2", "password": "longenough"},
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "b@example.com", "username": "bob", "password": "longenough"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "b@example.com", "password": "longenough"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.asyncio
async def test_login_wrong_password_unauthorized(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "c@example.com", "username": "carol", "password": "longenough"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "c@example.com", "password": "wrongpass"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "d@example.com", "username": "dave", "password": "longenough"},
    )
    token = register.json()["access_token"]
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "d@example.com"
    assert body["username"] == "dave"


@pytest.mark.asyncio
async def test_me_without_token_unauthorized(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_returns_new_access_token(client):
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "e@example.com", "username": "eve", "password": "longenough"},
    )
    refresh_token = register.json()["refresh_token"]
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.asyncio
async def test_refresh_rejects_access_token(client):
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "f@example.com", "username": "frank", "password": "longenough"},
    )
    access_token = register.json()["access_token"]
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": access_token}
    )
    assert response.status_code == 401
