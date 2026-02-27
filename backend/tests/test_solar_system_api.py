"""
Backend API Tests for Solar System B4 Application
Tests: Health check, Objects CRUD, Scene endpoints, Textures serving
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health and status endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        print(f"Root endpoint OK: {data}")
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"Health check OK: {data}")


class TestObjectsAPI:
    """Objects CRUD endpoint tests"""
    
    def test_get_all_objects(self):
        """Test GET /api/objects returns solar system objects"""
        response = requests.get(f"{BASE_URL}/api/objects")
        assert response.status_code == 200
        objects = response.json()
        
        # Should return a list of objects
        assert isinstance(objects, list)
        assert len(objects) > 0, "Objects list should not be empty"
        
        # Verify structure of first object
        first_obj = objects[0]
        assert "id" in first_obj
        assert "name" in first_obj
        assert "type" in first_obj
        
        # Verify we have Sun, planets, and satellites
        obj_names = [obj["name"] for obj in objects]
        assert "Sun" in obj_names, "Sun should be in objects"
        assert "Earth" in obj_names, "Earth should be in objects"
        assert "Saturn" in obj_names, "Saturn should be in objects"
        
        # Count by type
        types = [obj["type"] for obj in objects]
        assert "sun" in types
        assert "planet" in types
        assert "satellite" in types
        print(f"Found {len(objects)} objects with types: {set(types)}")
    
    def test_get_object_by_id(self):
        """Test GET /api/objects/{id} returns single object"""
        # First get all objects to get an ID
        response = requests.get(f"{BASE_URL}/api/objects")
        objects = response.json()
        
        # Get first object by ID
        first_obj = objects[0]
        obj_id = first_obj["id"]
        
        response = requests.get(f"{BASE_URL}/api/objects/{obj_id}")
        assert response.status_code == 200
        
        obj = response.json()
        assert obj["id"] == obj_id
        assert obj["name"] == first_obj["name"]
        print(f"Retrieved object by ID: {obj['name']}")
    
    def test_get_nonexistent_object(self):
        """Test GET /api/objects/{id} returns 404 for non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/objects/nonexistent-id-12345")
        assert response.status_code == 404
        print("404 returned for non-existent object as expected")
    
    def test_create_object(self):
        """Test POST /api/objects creates new object"""
        new_object = {
            "name": "TEST_Asteroid_Alpha",
            "type": "asteroid",
            "description": "Test asteroid for API testing",
            "customFields": {
                "moduleName": "Test Module",
                "apiType": "REST",
                "status": "active"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/objects", json=new_object)
        assert response.status_code == 200
        
        created = response.json()
        assert created["name"] == new_object["name"]
        assert created["type"] == new_object["type"]
        assert "id" in created
        assert "version" in created
        print(f"Created object: {created['name']} with ID: {created['id']}")
        
        return created["id"]
    
    def test_update_object(self):
        """Test PUT /api/objects/{id} updates object"""
        # Create a test object first
        new_object = {
            "name": "TEST_Update_Planet",
            "type": "planet",
            "description": "Test planet for update testing"
        }
        create_response = requests.post(f"{BASE_URL}/api/objects", json=new_object)
        created = create_response.json()
        obj_id = created["id"]
        
        # Update the object
        update_data = {
            "description": "Updated description for testing",
            "customFields": {
                "moduleName": "Updated Module",
                "status": "maintenance"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/objects/{obj_id}", json=update_data)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["description"] == update_data["description"]
        assert updated["customFields"]["moduleName"] == "Updated Module"
        assert updated["version"] > 1, "Version should increment after update"
        print(f"Updated object: {updated['name']}, version: {updated['version']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/objects/{obj_id}")
        fetched = get_response.json()
        assert fetched["description"] == update_data["description"]
    
    def test_delete_object(self):
        """Test DELETE /api/objects/{id} deletes object"""
        # Create a test object first
        new_object = {
            "name": "TEST_Delete_Asteroid",
            "type": "asteroid",
            "description": "Test asteroid for deletion"
        }
        create_response = requests.post(f"{BASE_URL}/api/objects", json=new_object)
        created = create_response.json()
        obj_id = created["id"]
        
        # Delete the object
        response = requests.delete(f"{BASE_URL}/api/objects/{obj_id}")
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/objects/{obj_id}")
        assert get_response.status_code == 404
        print(f"Deleted object successfully: {obj_id}")


class TestSceneAPI:
    """Scene manifest endpoint tests"""
    
    def test_get_scene(self):
        """Test GET /api/scene returns scene manifest"""
        response = requests.get(f"{BASE_URL}/api/scene")
        assert response.status_code == 200
        
        scene = response.json()
        assert "id" in scene
        assert "name" in scene
        assert "manifestJson" in scene
        assert "cameraPresets" in scene
        assert "timeSettings" in scene
        
        # Verify camera presets structure
        presets = scene["cameraPresets"]
        assert isinstance(presets, list)
        if len(presets) > 0:
            assert "name" in presets[0]
            assert "position" in presets[0]
        
        print(f"Scene manifest: {scene['name']}, presets: {len(presets)}")
    
    def test_save_scene(self):
        """Test POST /api/scene saves scene manifest"""
        scene_data = {
            "name": "B4 Solar System - Test",
            "manifestJson": {
                "sunPosition": [0, 0, 0],
                "cameraPosition": [0, 60, 120],
                "ambientLight": 0.15
            },
            "cameraPresets": [
                {"name": "Test Preset", "position": [0, 100, 100], "target": [0, 0, 0]}
            ],
            "timeSettings": {"speed": 2.0, "paused": False},
            "version": "1.0.0"
        }
        
        response = requests.post(f"{BASE_URL}/api/scene", json=scene_data)
        assert response.status_code == 200
        
        saved = response.json()
        assert saved["name"] == scene_data["name"]
        assert saved["timeSettings"]["speed"] == 2.0
        print("Scene manifest saved successfully")


class TestTexturesAPI:
    """Texture serving endpoint tests"""
    
    def test_sun_texture_served(self):
        """Test /api/textures/2k_sun.jpg serves texture"""
        response = requests.get(f"{BASE_URL}/api/textures/2k_sun.jpg")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("image/")
        assert len(response.content) > 0
        print(f"Sun texture served: {len(response.content)} bytes")
    
    def test_earth_texture_served(self):
        """Test /api/textures/2k_earth_daymap.jpg serves texture"""
        response = requests.get(f"{BASE_URL}/api/textures/2k_earth_daymap.jpg")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("image/")
        print(f"Earth texture served: {len(response.content)} bytes")
    
    def test_saturn_ring_texture_served(self):
        """Test /api/textures/2k_saturn_ring_alpha.png serves texture"""
        response = requests.get(f"{BASE_URL}/api/textures/2k_saturn_ring_alpha.png")
        assert response.status_code == 200
        print(f"Saturn ring texture served: {len(response.content)} bytes")
    
    def test_all_planet_textures_accessible(self):
        """Test all planet textures are accessible"""
        textures = [
            "2k_sun.jpg", "2k_mercury.jpg", "2k_venus_surface.jpg",
            "2k_earth_daymap.jpg", "2k_earth_clouds.jpg", "2k_mars.jpg",
            "2k_jupiter.jpg", "2k_saturn.jpg", "2k_saturn_ring_alpha.png",
            "2k_uranus.jpg", "2k_neptune.jpg"
        ]
        
        for tex in textures:
            response = requests.get(f"{BASE_URL}/api/textures/{tex}")
            assert response.status_code == 200, f"Texture {tex} not accessible"
        
        print(f"All {len(textures)} textures accessible")
    
    def test_nonexistent_texture_returns_404(self):
        """Test non-existent texture returns 404"""
        response = requests.get(f"{BASE_URL}/api/textures/nonexistent.jpg")
        assert response.status_code == 404
        print("404 returned for non-existent texture as expected")


class TestObjectsDataStructure:
    """Verify data structure of objects for frontend compatibility"""
    
    def test_sun_object_structure(self):
        """Test Sun object has correct structure"""
        response = requests.get(f"{BASE_URL}/api/objects")
        objects = response.json()
        
        sun = next((obj for obj in objects if obj["name"] == "Sun"), None)
        assert sun is not None, "Sun object must exist"
        
        assert sun["type"] == "sun"
        assert "customFields" in sun
        assert "position" in sun
        print(f"Sun object verified: type={sun['type']}")
    
    def test_planets_have_orbit_params(self):
        """Test planet objects have orbit parameters"""
        response = requests.get(f"{BASE_URL}/api/objects")
        objects = response.json()
        
        planets = [obj for obj in objects if obj["type"] == "planet"]
        assert len(planets) >= 8, "Should have 8 planets"
        
        for planet in planets:
            # All planets should have orbit radius
            assert "orbitRadius" in planet, f"{planet['name']} missing orbitRadius"
        
        print(f"Verified orbit params for {len(planets)} planets")
    
    def test_satellites_exist_with_real_moon_names(self):
        """Test satellite objects exist with real moon names in correct order"""
        response = requests.get(f"{BASE_URL}/api/objects")
        objects = response.json()
        
        satellites = [obj for obj in objects if obj["type"] == "satellite"]
        assert len(satellites) == 8, f"Should have exactly 8 satellites, got {len(satellites)}"
        
        # Expected satellite order: Phobos, Deimos, Europa, Ganymede, Callisto, Titan, Enceladus, Moon (LAST)
        expected_names = ["Phobos", "Deimos", "Europa", "Ganymede", "Callisto", "Titan", "Enceladus", "Moon"]
        expected_modules = ["Auth API", "Payment Gateway", "Notification Service", "Search Engine", 
                           "Cache Layer", "Message Queue", "Log Aggregator", "Config Server"]
        
        satellite_names = [sat["name"] for sat in satellites]
        
        # Verify all expected moons exist
        for name in expected_names:
            assert name in satellite_names, f"Real moon '{name}' missing from satellites"
        
        # Verify Moon is last in the list
        assert satellites[-1]["name"] == "Moon", f"Moon must be LAST, but got {satellites[-1]['name']}"
        
        # Verify each satellite has correct module name
        for sat in satellites:
            assert "customFields" in sat
            assert sat["customFields"].get("moduleName") is not None
            # Verify the module name is one of the expected ones
            assert sat["customFields"]["moduleName"] in expected_modules, \
                f"Unexpected module name: {sat['customFields']['moduleName']}"
        
        print(f"Found {len(satellites)} satellites with real moon names: {satellite_names}")


class TestStatusAPI:
    """Status tracking endpoint tests"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates status check"""
        status_data = {"client_name": "TEST_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=status_data)
        assert response.status_code == 200
        
        created = response.json()
        assert "id" in created
        assert created["client_name"] == "TEST_client"
        assert "timestamp" in created
        print("Status check created successfully")
    
    def test_get_status_checks(self):
        """Test GET /api/status returns status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        
        checks = response.json()
        assert isinstance(checks, list)
        print(f"Retrieved {len(checks)} status checks")


# Cleanup test data after tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after tests complete"""
    yield
    # Cleanup after all tests
    try:
        response = requests.get(f"{BASE_URL}/api/objects")
        if response.status_code == 200:
            objects = response.json()
            for obj in objects:
                if obj["name"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/objects/{obj['id']}")
            print("Cleaned up test data")
    except Exception as e:
        print(f"Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
