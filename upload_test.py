import requests
import time

files = {'file': open('act_liver_disease.csv', 'rb')}
res = requests.post("http://localhost:8001/knowledge/upload", files=files)
if res.status_code == 200:
    job_id = res.json().get('job_id')
    print(f"Upload successful. Job ID: {job_id}")
    
    print("Triggering build...")
    res_build = requests.post(f"http://localhost:8001/knowledge/jobs/{job_id}/build")
    print(f"Build status: {res_build.status_code} - {res_build.text}")
    
    # Wait for background job to potentially finish
    time.sleep(10)
else:
    print(f"Upload failed: {res.status_code} - {res.text}")
