import os
import requests
import json
api_key = os.environ.get("GEMINI_API_KEY")
print("We need the api key to list models, let's test if text-embedding-004 works!")
