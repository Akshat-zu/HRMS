# HRMS Lite

A lightweight Human Resource Management System built with Flask and Vanilla JS.

## Tech Stack
- **Backend**: Python, Flask, SQLite
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Deployment**: Ready for services like Heroku, Render, etc.

## Features
- **Dashboard**: KPI Cards (Total/Present/Absent) and 7-Day Attendance Trend Chart.
- **Employee Management**: Add, List, Delete employees, View Individual History.
- **Attendance Tracking**: Mark daily attendance, View history.
- **Attendance Records**: Search and filter attendance logs by Name or ID.
- **RESTful API**: Clean JSON API for all operations.

## Setup Instructions

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/hrms-lite.git
    cd hrms-lite
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Application**:
    ```bash
    python backend/app.py
    ```

4.  **Access the Dashboard**:
    Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Assumptions
- Single admin user (no authentication).
- SQLite is sufficient for data persistence (file-based).
- Frontend is served by Flask for simplicity in this assignments scope.

## API Endpoints

- `GET /api/employees` - List all employees
- `GET /api/employees/<id>` - Get single employee details
- `POST /api/employees` - Add new employee
- `DELETE /api/employees/<id>` - Delete employee
- `GET /api/attendance?search=<query>` - Get attendance records (optional search)
- `GET /api/attendance/<id>` - Get attendance for specific employee
- `POST /api/attendance` - Mark attendance
- `GET /api/dashboard-stats` - Get dashboard KPIs and trend data
