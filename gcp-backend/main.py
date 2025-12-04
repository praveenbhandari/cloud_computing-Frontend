"""
ZeroVault GCP Cloud Function
Adapted from AWS Lambda function for Google Cloud Platform
"""
import json
import os
import uuid
import hashlib
from datetime import datetime, timedelta
from google.cloud import firestore
from functions_framework import http

# Initialize Firestore client
db = firestore.Client()

def cors_headers():
    """Return CORS headers"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json'
    }

def hash_password(password, salt):
    """Hash password using PBKDF2"""
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()

def generate_session_token():
    """Generate random session token"""
    return hashlib.sha256(os.urandom(32)).hexdigest()

def validate_session(token):
    """Validate session token and return user ID"""
    try:
        sessions_ref = db.collection('sessions')
        session_doc = sessions_ref.document(token).get()
        
        if not session_doc.exists:
            return None
        
        session_data = session_doc.to_dict()
        expiry = datetime.fromisoformat(session_data['expiresAt'])
        
        if datetime.utcnow() > expiry:
            # Delete expired session
            sessions_ref.document(token).delete()
            return None
        
        return session_data['userId']
    except Exception as e:
        print(f"Session validation error: {e}")
        return None

@http
def handle_request(request):
    """Cloud Function entry point"""
    try:
        # Parse request
        path = request.path
        method = request.method
        
        # Handle CORS preflight
        if method == 'OPTIONS':
            return ('', 200, cors_headers())
        
        # Parse body for POST/PUT requests
        body = {}
        if method in ['POST', 'PUT']:
            try:
                body = request.get_json() or {}
            except:
                body = {}
        
        # Public endpoints (no auth required)
        if path == '/auth/register' and method == 'POST':
            email = body.get('email', '').lower().strip()
            password = body.get('password', '')
            
            if not email or not password:
                return (
                    json.dumps({'error': 'Email and password required'}),
                    400,
                    cors_headers()
                )
            
            # Check if user exists
            users_ref = db.collection('users')
            query = users_ref.where('email', '==', email).limit(1)
            existing_users = list(query.stream())
            
            if existing_users:
                return (
                    json.dumps({'error': 'User already exists'}),
                    409,
                    cors_headers()
                )
            
            # Create user
            user_id = str(uuid.uuid4())
            salt = hashlib.sha256(os.urandom(32)).hexdigest()
            password_hash = hash_password(password, salt)
            
            users_ref.document(user_id).set({
                'userId': user_id,
                'email': email,
                'passwordHash': password_hash,
                'salt': salt,
                'createdAt': datetime.utcnow().isoformat()
            })
            
            return (
                json.dumps({'message': 'User created successfully', 'userId': user_id}),
                201,
                cors_headers()
            )
        
        if path == '/auth/login' and method == 'POST':
            email = body.get('email', '').lower().strip()
            password = body.get('password', '')
            
            if not email or not password:
                return (
                    json.dumps({'error': 'Email and password required'}),
                    400,
                    cors_headers()
                )
            
            # Find user
            users_ref = db.collection('users')
            query = users_ref.where('email', '==', email).limit(1)
            users = list(query.stream())
            
            if not users:
                return (
                    json.dumps({'error': 'Invalid credentials'}),
                    401,
                    cors_headers()
                )
            
            user_doc = users[0]
            user = user_doc.to_dict()
            password_hash = hash_password(password, user['salt'])
            
            if password_hash != user['passwordHash']:
                return (
                    json.dumps({'error': 'Invalid credentials'}),
                    401,
                    cors_headers()
                )
            
            # Create session
            session_token = generate_session_token()
            expiry = datetime.utcnow() + timedelta(hours=24)
            
            sessions_ref = db.collection('sessions')
            sessions_ref.document(session_token).set({
                'sessionToken': session_token,
                'userId': user['userId'],
                'email': user['email'],
                'expiresAt': expiry.isoformat(),
                'createdAt': datetime.utcnow().isoformat()
            })
            
            return (
                json.dumps({
                    'token': session_token,
                    'userId': user['userId'],
                    'email': user['email'],
                    'expiresAt': expiry.isoformat()
                }),
                200,
                cors_headers()
            )
        
        # Protected endpoints (require auth)
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return (
                json.dumps({'error': 'Unauthorized'}),
                401,
                cors_headers()
            )
        
        token = auth_header.replace('Bearer ', '')
        user_id = validate_session(token)
        
        if not user_id:
            return (
                json.dumps({'error': 'Invalid or expired session'}),
                401,
                cors_headers()
            )
        
        # Vault endpoints
        if path == '/vaults' and method == 'GET':
            vaults_ref = db.collection('vaults')
            query = vaults_ref.where('userId', '==', user_id)
            vaults = [doc.to_dict() for doc in query.stream()]
            
            return (
                json.dumps({'vaults': vaults}),
                200,
                cors_headers()
            )
        
        if path == '/vaults' and method == 'POST':
            vault_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            vault_data = {
                'userId': user_id,
                'vaultId': vault_id,
                'name': body.get('name', ''),
                'encryptedSecret': body.get('encryptedSecret', ''),
                'salt': body.get('salt', ''),
                'createdAt': now,
                'updatedAt': now
            }
            
            vaults_ref = db.collection('vaults')
            vaults_ref.document(vault_id).set(vault_data)
            
            return (
                json.dumps({'vault': vault_data}),
                201,
                cors_headers()
            )
        
        if path.startswith('/vaults/') and method == 'GET':
            vault_id = path.split('/')[-1]
            vaults_ref = db.collection('vaults')
            vault_doc = vaults_ref.document(vault_id).get()
            
            if not vault_doc.exists:
                return (
                    json.dumps({'error': 'Vault not found'}),
                    404,
                    cors_headers()
                )
            
            vault = vault_doc.to_dict()
            # Verify ownership
            if vault.get('userId') != user_id:
                return (
                    json.dumps({'error': 'Unauthorized'}),
                    403,
                    cors_headers()
                )
            
            return (
                json.dumps({'vault': vault}),
                200,
                cors_headers()
            )
        
        if path.startswith('/vaults/') and method == 'PUT':
            vault_id = path.split('/')[-1]
            vaults_ref = db.collection('vaults')
            vault_doc = vaults_ref.document(vault_id).get()
            
            if not vault_doc.exists:
                return (
                    json.dumps({'error': 'Vault not found'}),
                    404,
                    cors_headers()
                )
            
            vault = vault_doc.to_dict()
            if vault.get('userId') != user_id:
                return (
                    json.dumps({'error': 'Unauthorized'}),
                    403,
                    cors_headers()
                )
            
            # Update vault
            updates = {'updatedAt': datetime.utcnow().isoformat()}
            if 'name' in body:
                updates['name'] = body['name']
            if 'encryptedSecret' in body:
                updates['encryptedSecret'] = body['encryptedSecret']
            if 'salt' in body:
                updates['salt'] = body['salt']
            
            vaults_ref.document(vault_id).update(updates)
            updated_vault = vault_doc.to_dict()
            updated_vault.update(updates)
            
            return (
                json.dumps({'vault': updated_vault}),
                200,
                cors_headers()
            )
        
        if path.startswith('/vaults/') and method == 'DELETE':
            vault_id = path.split('/')[-1]
            vaults_ref = db.collection('vaults')
            vault_doc = vaults_ref.document(vault_id).get()
            
            if not vault_doc.exists:
                return (
                    json.dumps({'error': 'Vault not found'}),
                    404,
                    cors_headers()
                )
            
            vault = vault_doc.to_dict()
            if vault.get('userId') != user_id:
                return (
                    json.dumps({'error': 'Unauthorized'}),
                    403,
                    cors_headers()
                )
            
            vaults_ref.document(vault_id).delete()
            return ('', 204, cors_headers())
        
        if path == '/auth/logout' and method == 'POST':
            sessions_ref = db.collection('sessions')
            sessions_ref.document(token).delete()
            return (
                json.dumps({'message': 'Logged out successfully'}),
                200,
                cors_headers()
            )
        
        return (
            json.dumps({'error': 'Not found'}),
            404,
            cors_headers()
        )
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return (
            json.dumps({'error': 'Internal server error', 'details': str(e)}),
            500,
            cors_headers()
        )

