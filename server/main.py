from flask import Flask, request, Response
from Class.Database import Database
from Class.AnimeSama import AnimeSama
from Class.Proxy import Proxy
from Class.Downloader import Downloader
import ast
import jwt
import json
import random
import string
import requests
from credientials import *
from flask_cors import CORS
from PIL import Image
from io import BytesIO
# import logging
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

db = Database()
site = AnimeSama(db)
app = Flask(__name__)
app.config['SECRET_KEY'] = ''.join(random.choices(string.ascii_letters + string.digits, k=20))
download = Downloader(db)
CORS(app)
list_available_ip = []

def generate_token():
    return (jwt.encode({}, app.config['SECRET_KEY'], algorithm='HS256'))

def decode_token(token):
    try:
        return (jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256']))
    except jwt.ExpiredSignatureError:
        return (None)
    except jwt.InvalidTokenError:
        return (None)

@app.route('/api/login', methods=['POST'])
def login():
	data = request.get_json()
	need_keys = ['password']

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		if (data['password'] == password):
			return ({'token': generate_token()})
		return ({'error': 'Invalid password'})
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/check_token', methods=['POST'])
def check_token():
	data = request.get_json()
	need_keys = ['token']

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		if (decode_token(data['token']) == None):
			return ({'error': 'Invalid token'})
		return ({'status': 'success'})
	except Exception as e:
		return ({'error': str(e)})
	
def check_token_in_request():
	if (request.headers.get('Authorization') == None or decode_token(request.headers.get('Authorization')) == None):
		return (Response(
			response=json.dumps({'error': 'Invalid or missing token'}),
			status=401,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	return (None)

@app.route('/api/add_user', methods=['POST'])
def add_user():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['name']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		db.insert_user(data['name'])
		return ({'status': 'success'})
	except Exception as e:
		return ({'error': str(e)})

@app.route('/api/get_users')
def get_users():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	try:
		users = db.get_users()
		return (users)
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/get_name', methods=['POST'])
def get_name():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['id']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		name = db.get_name_by_id(data['id'])
		return (name)
	except Exception as e:
		return ({'error': str(e)})


@app.route('/api/get_all_anime')
def get_all_anime():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	try:
		anime_list = db.get_all_anime()
		all_anime = []
		for anime in anime_list:
			all_anime.append({
				'id': anime[0],
				'title': anime[1],
				'alternative_title': anime[2],
				'genre': ast.literal_eval(anime[3]),
				'url': anime[4],
				'img': anime[5]
			})
		return (Response(
			response=json.dumps(all_anime),
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return (Response(
			response=json.dumps({'error': str(e)}),
			status=500,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))

@app.route('/api/get_anime_season', methods=['POST'])
def get_anime_season():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['url']
	anime = request.get_json()

	try:
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		season = site.get_anime_season(anime)
		return (Response(
			response=json.dumps({'season': season}),
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return (Response(
			response=json.dumps({'error': str(e)}),
			status=500,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))

@app.route('/api/get_anime_episodes', methods=['POST'])
def get_anime_episodes():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['url', 'serverUrl', 'season']

	try:
		anime = request.get_json()
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		episode = site.get_anime_episodes(anime)
		return (Response(
			response=json.dumps(episode),
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return (Response(
			response=json.dumps({'error': str(e)}),
			status=500,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	
@app.route('/api/srcFile', methods=['POST'])
def srcFile():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	url = 'https://' + request.url.split('?', 1)[1]
	need_keys = ['serverUrl']

	if (request.remote_addr not in list_available_ip):
		list_available_ip.append(request.remote_addr)
	try:
		anime = request.get_json()
		if (url == 'https://'):
			return {'error': 'Missing url'}
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		return (Response(
			response=json.dumps({'src': site.get_source_file(url, anime['serverUrl'])}),
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return (Response(
			response=json.dumps({'error': str(e)}),
			status=500,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))

@app.route('/api/video')
def video():
	if (request.remote_addr not in list_available_ip):
		return (Response(
			response=json.dumps({'error': 'Access denied'}),
			status=403,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	url = 'https://' + request.url.split('?', 1)[1]
	request_host = request.url_root

	if (request_host[-1] == '/'):
		request_host = request_host[:-1]
	try:
		if (url == 'https://'):
			return (Response(
				response=json.dumps({'error': 'Missing url'}),
				status=500,
				mimetype='application/json',
				headers={'Access-Control-Allow-Origin': '*'}
			))
		if (url.find('sibnet') != -1):
			return (Proxy.sibnet(url))
		elif (url.find('oneupload') != -1):
			return (Proxy.oneupload(url))
		elif (url.find('sendvid') != -1):
			return (Proxy.sendvid(url))
		else:
			return (Proxy.vidmoly(url, request_host))
	except Exception as e:
		return ({'error': str(e)})

@app.route('/api/update_progress', methods=['POST'])
def update_progress():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['id', 'episode', 'seasonId', 'progress', 'totalEpisode', 'allSeasons', 'poster', 'idUser']
	anime = request.get_json()

	try:
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		db.update_progress(anime)
		return ({'status': 'success'})
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/get_progress', methods=['POST'])
def get_progress():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['id', 'idUser']
	anime = request.get_json()

	try:
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		progress = db.get_progress(anime)
		return (progress)
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/get_all_progress', methods=['POST'])
def get_all_progress():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['idUser']
	anime = request.get_json()

	try:
		for key in need_keys:
			if key not in anime:
				return ({'error': 'Missing key ' + key})
		progress = db.get_all_progress(anime['idUser'])
		return (progress)
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/tmdb', methods=['POST'])
def tmdb():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['url']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		if (data['url'].startswith('https://api.themoviedb.org/3/') == False):
			return {'error': 'Invalid url'}
		response = requests.get(data['url'].replace('{api_key_tmdb}', 'api_key=' + key_api_tmbd))
		return (Response(
			response=response.text,
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/get_average_color', methods=['POST'])
def get_average_color():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['url']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		response = requests.get(data['url'])
		image = Image.open(BytesIO(response.content))
		image = image.resize((25, 25))
		pixels = list(image.getdata())
		total_pixels = len(pixels)
		avg_color = tuple(sum(channel) // total_pixels for channel in zip(*pixels))
		return (Response(
			response=json.dumps({'average_color': avg_color}),
			status=200,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	except Exception as e:
		return ({'error': str(e)})


@app.route('/api/download', methods=['POST'])
def download_func():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['src', 'name', 'episode', 'season', 'serverUrl', 'poster']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		download.add(data)
		return ({'status': 'success'})
	except Exception as e:
		return {'error': str(e)}

@app.route('/api/get_status_download')
def get_status_download():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	try:
		status = download.get_status()
		return (status)
	except Exception as e:
		return ({'error': str(e)})
	
@app.route('/api/del_download', methods=['POST'])
def delete_download():
	token_valid = check_token_in_request()

	if (token_valid != None):
		return (token_valid)
	need_keys = ['id']
	data = request.get_json()

	try:
		for key in need_keys:
			if key not in data:
				return ({'error': 'Missing key ' + key})
		download.delete(data['id'])
		return ({'status': 'success'})
	except Exception as e:
		return {'error': str(e)}
	
@app.route('/api/download/<name>')
def downloadEp(name):
	if (request.remote_addr not in list_available_ip):
		return (Response(
			response=json.dumps({'error': 'Access denied'}),
			status=403,
			mimetype='application/json',
			headers={'Access-Control-Allow-Origin': '*'}
		))
	try:
		return (download.download(name))
	except Exception as e:
		return ({'error': str(e)})
	
if __name__ == '__main__':
	app.run(debug=False, port=8080, host='0.0.0.0')