from flask import Flask, jsonify, request
from flask_cors import CORS
from database import get_db_connection, init_db
import sqlite3
import uuid

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app)

# Initialize DB on startup
with app.app_context():
    init_db()

@app.route('/')
def index():
    return app.send_static_file('index.html')

# --- Employee Routes ---

@app.route('/api/employees', methods=['GET'])
def get_employees():
    conn = get_db_connection()
    employees = conn.execute('SELECT * FROM employees ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in employees])

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.json
    
    if not data or not all(k in data for k in ('employee_id', 'name', 'email', 'department')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        conn = get_db_connection()
        conn.execute('INSERT INTO employees (id, name, email, department) VALUES (?, ?, ?, ?)',
                     (data['employee_id'], data['name'], data['email'], data['department']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Employee added successfully'}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({'error': 'Employee ID or Email already exists'}), 409
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<id>', methods=['DELETE'])
def delete_employee(id):
    conn = get_db_connection()
    result = conn.execute('DELETE FROM employees WHERE id = ?', (id,))
    conn.commit()
    deleted = result.rowcount > 0
    conn.close()
    
    if deleted:
        return jsonify({'message': 'Employee deleted successfully'}), 200
    else:
        return jsonify({'error': 'Employee not found'}), 404

@app.route('/api/employees/<id>', methods=['GET'])
def get_employee(id):
    conn = get_db_connection()
    employee = conn.execute('SELECT * FROM employees WHERE id = ?', (id,)).fetchone()
    conn.close()
    
    if employee:
        return jsonify(dict(employee))
    else:
        return jsonify({'error': 'Employee not found'}), 404

# --- Attendance Routes ---

@app.route('/api/attendance', methods=['POST'])
def mark_attendance():
    data = request.json
    if not data or not all(k in data for k in ('employee_id', 'date', 'status')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if data['status'] not in ['Present', 'Absent']:
        return jsonify({'error': 'Invalid status. Must be Present or Absent'}), 400

    try:
        conn = get_db_connection()
        # Check if employee exists
        emp = conn.execute('SELECT id FROM employees WHERE id = ?', (data['employee_id'],)).fetchone()
        if not emp:
            conn.close()
            return jsonify({'error': 'Employee not found'}), 404
            
        conn.execute('INSERT OR REPLACE INTO attendance (employee_id, date, status) VALUES (?, ?, ?)',
                     (data['employee_id'], data['date'], data['status']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Attendance marked successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/<employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    conn = get_db_connection()
    records = conn.execute('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC', (employee_id,)).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in records])

@app.route('/api/attendance', methods=['GET'])
def get_all_attendance():
    search = request.args.get('search', '').strip()
    conn = get_db_connection()
    
    query = '''
        SELECT a.*, e.name as employee_name 
        FROM attendance a 
        JOIN employees e ON a.employee_id = e.id 
    '''
    params = []
    
    if search:
        query += ' WHERE e.name LIKE ? OR a.employee_id LIKE ?'
        params.extend([f'%{search}%', f'%{search}%'])
        
    query += ' ORDER BY a.date DESC'
    
    records = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in records])

@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    conn = get_db_connection()
    
    # Total Employees
    total_employees = conn.execute('SELECT COUNT(*) FROM employees').fetchone()[0]
    
    # Today's Stats
    today = conn.execute("SELECT date('now', 'localtime')").fetchone()[0]
    
    present_today = conn.execute(
        "SELECT COUNT(DISTINCT employee_id) FROM attendance WHERE date = ? AND status = 'Present'", 
        (today,)
    ).fetchone()[0]
    
    absent_today = conn.execute(
        "SELECT COUNT(DISTINCT employee_id) FROM attendance WHERE date = ? AND status = 'Absent'", 
        (today,)
    ).fetchone()[0]
    
    # Weekly Trend (Last 7 Days)
    # Generate last 7 days list first to ensure no gaps, or just query what we have
    trend_query = '''
        SELECT date, COUNT(*) as present_count 
        FROM attendance 
        WHERE status = 'Present' 
        AND date >= date('now', 'localtime', '-6 days')
        GROUP BY date 
        ORDER BY date ASC
    '''
    trend_data = conn.execute(trend_query).fetchall()
    
    conn.close()
    
    return jsonify({
        'total_employees': total_employees,
        'today_present': present_today,
        'today_absent': absent_today,
        'trend': [dict(ix) for ix in trend_data]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
