import urllib.request
import json
import time
import sys

url = 'https://eureka-backend-vedn.onrender.com/knowledge/semantic/certify'
req = urllib.request.Request(url, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print('Started job:', data)
        sys.stdout.flush()
        job_id = data['job_id']
        
        for _ in range(30):
            job_url = f'https://eureka-backend-vedn.onrender.com/knowledge/jobs/{job_id}'
            job_req = urllib.request.Request(job_url)
            with urllib.request.urlopen(job_req) as job_res:
                job_data = json.loads(job_res.read().decode('utf-8'))
                print('Job status:', job_data['status'], 'Progress:', job_data.get('progress'))
                sys.stdout.flush()
                if job_data['status'] in ['completed', 'failed']:
                    if 'error' in job_data:
                        print('Error:', job_data['error'])
                    break
            time.sleep(1)
except Exception as e:
    print('Error:', e)
