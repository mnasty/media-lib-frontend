from flask import Flask, jsonify, request, send_file
import os
import logging
from flask_cors import CORS
import smbclient  # Add SMB client library

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'development-key')
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST"],
            "allow_headers": ["*"]
        }
    })
    
    # Initialize SMB client with guest credentials
    smbclient.ClientConfig(
        username=os.getenv('SAMBA_USERNAME', 'guest'),
        password=os.getenv('SAMBA_PASSWORD', '')
    )
    
    # Configure detailed logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
    )
    app.logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.DEBUG)

    @app.before_request
    def log_request():
        app.logger.debug(f"Incoming Request: {request.method} {request.url}")
        app.logger.debug(f"Headers: {dict(request.headers)}")
        app.logger.debug(f"Args: {request.args}")
        app.logger.debug(f"Form: {request.form}")
        app.logger.debug(f"Data: {request.get_data()}")

    @app.route('/api/test')
    def test_endpoint():
        return jsonify({"status": "ok"}), 200

    @app.route('/api/config')
    def get_config():
        try:
            app.logger.info("Processing /api/config request")
            samba_path = os.environ.get('SAMBA_SHARE_PATH')
            
            if not samba_path:
                # Provide default development path
                dev_path = os.path.abspath(os.path.join(
                    os.path.dirname(__file__), 
                    '..', 
                    'mnt'  # Changed from 'media' to 'mnt'
                ))
                app.logger.warning(f"Using development media path: {dev_path}")
                return jsonify({'sambaSharePath': dev_path})
                
            # Test SMB connection
            with smbclient.open_file(rf"{samba_path}/testfile.txt", mode='r') as f:
                pass
                
            # Create a test file if needed
            test_path = os.path.join(samba_path, "testfile.txt")
            if not os.path.exists(test_path):
                with open(test_path, 'w') as f:
                    f.write("connection test")
                
            app.logger.debug(f"Using SAMBA_SHARE_PATH: {samba_path}")
            return jsonify({'sambaSharePath': samba_path})
            
        except Exception as e:
            app.logger.error(f"SMB Connection Error: {str(e)}")
            return jsonify({"error": f"SMB access failed: {str(e)}"}), 403

    @app.after_request
    def log_response(response):
        app.logger.debug(f"Outgoing Response: {response.status}")
        app.logger.debug(f"Response Headers: {dict(response.headers)}")
        app.logger.debug(f"Response Data: {response.get_data()}")
        return response

    # Add explicit 403 handler
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden", "message": str(error)}), 403

    # Catch-all route should come LAST
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        return jsonify({"error": "Not Found"}), 404

    @app.route('/media/<path:filename>')
    def serve_media(filename):
        samba_path = os.environ.get('SAMBA_SHARE_PATH', '')
        full_path = os.path.join(samba_path, filename)
        return send_file(full_path, mimetype='video/mp4')

    @app.route('/api/videos/<video_id>')
    def get_video(video_id):
        try:
            app.logger.info(f"Fetching video metadata for ID: {video_id}")
            
            # Replace this with actual database lookup
            mock_video = {
                "id": video_id,
                "title": "Sample Video",
                "path": "videos/sample.mp4",  # Relative to Samba share
                "description": "Test video"
            }
            
            return jsonify(mock_video)
            
        except Exception as e:
            app.logger.error(f"Video lookup error: {str(e)}")
            return jsonify({"error": "Video not found"}), 404

    return app

# Run this only when executed directly, not when imported
if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))  # Use environment variable
    app = create_app()
    app.run(port=port) 