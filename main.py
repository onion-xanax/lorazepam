from flask import Flask, render_template, send_from_directory, jsonify, request, send_file
import os
import requests
import json
import tempfile

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

def fetch_phone_data(phone):
    api_url = f"https://api.depsearch.sbs/quest={phone}?token=0jv8SQHONMpyRmyRKImo8jT1d4AYqsNu&lang=ru"
    try:
        response = requests.get(api_url, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return {'error': f'API request failed with status {response.status_code}'}
    except requests.exceptions.Timeout:
        return {'error': 'API request timeout'}
    except requests.exceptions.RequestException as e:
        return {'error': f'Request error: {str(e)}'}
    except Exception as e:
        return {'error': f'Request error: {str(e)}'}

@app.route('/')
def index():
    return render_template('web.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('logo', 'logo.ico')

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

@app.route('/api/search_phone', methods=['POST'])
def search_phone():
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        
        if not phone:
            return jsonify({'error': 'Phone number is required'}), 400
        
        result = fetch_phone_data(phone)
        return jsonify(result)
            
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON response from API'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/save_txt', methods=['POST'])
def save_txt():
    try:
        data = request.get_json()
        content = data.get('content', '')
        
        if not content:
            return jsonify({'error': 'No content to save'}), 400
            
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(content)
            temp_file = f.name
            
        return send_file(temp_file, as_attachment=True, download_name='search_results.txt')
            
    except Exception as e:
        return jsonify({'error': f'Error saving TXT: {str(e)}'}), 500

@app.route('/api/save_json', methods=['POST'])
def save_json():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data to save'}), 400
            
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            temp_file = f.name
            
        return send_file(temp_file, as_attachment=True, download_name='search_results.json')
            
    except Exception as e:
        return jsonify({'error': f'Error saving JSON: {str(e)}'}), 500

@app.route('/api/clear_cmd', methods=['POST'])
def clear_cmd():
    return jsonify({'success': True, 'message': 'CMD cleared'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, threaded=True)