#!/usr/bin/env python3
"""
Example Python project to test Ctx language detection
"""

import requests
import json
from datetime import datetime

def fetch_data():
    """Fetch some data from an API"""
    response = requests.get("https://api.github.com/users/octocat")
    return response.json()

def process_data(data):
    """Process the fetched data"""
    processed = {
        "username": data.get("login"),
        "name": data.get("name"),
        "public_repos": data.get("public_repos"),
        "timestamp": datetime.now().isoformat()
    }
    return processed

def main():
    """Main function"""
    print("Fetching GitHub user data...")
    data = fetch_data()
    processed = process_data(data)
    
    print(f"User: {processed['username']}")
    print(f"Name: {processed['name']}")
    print(f"Public repos: {processed['public_repos']}")
    
    # Save to file
    with open("user_data.json", "w") as f:
        json.dump(processed, f, indent=2)
    
    print("Data saved to user_data.json")

if __name__ == "__main__":
    main()
