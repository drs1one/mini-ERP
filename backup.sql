PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);
INSERT INTO "admins" ("id","username","password") VALUES(1,'admin','054cc375d093dca44d9fe29a7c1386f39c0e819228ec7328a9c0b5d94cf01702');
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT UNIQUE NOT NULL, -- Internal ID code for your reference
    name TEXT NOT NULL,
    hourly_rate REAL DEFAULT 0,
    has_transport INTEGER DEFAULT 0, -- 1 = Yes, 0 = No
    transport_allowance REAL DEFAULT 0,
    prime REAL DEFAULT 0,
    advance REAL DEFAULT 0,
    credit REAL DEFAULT 0
);
CREATE TABLE weekly_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT NOT NULL, -- 'Monday', 'Friday', etc.
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    pause_minutes INTEGER DEFAULT 30
);
CREATE TABLE time_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    date TEXT,
    clock_in TEXT,
    clock_out TEXT,
    total_hours_worked REAL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'bureau', 'tailoring', 'sewing'
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    min_threshold REAL DEFAULT 5
);
CREATE TABLE production_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE,
    client_name TEXT,
    product_details TEXT,
    target_quantity INTEGER,
    completed_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending'
);
CREATE TABLE worker_task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    order_id INTEGER,
    task_name TEXT, -- e.g., 'pocket sewing', 'cutting'
    quantity_produced INTEGER,
    logged_date TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (order_id) REFERENCES production_orders(id)
);
CREATE TABLE weekly_schedule_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT UNIQUE, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    default_clock_in TEXT,   -- e.g., '08:30'
    default_clock_out TEXT,  -- e.g., '17:30'
    break_minutes INTEGER,   -- 30 for normal, 90 for Friday, 0 for Sunday
    is_working_day BOOLEAN   -- 1 for working, 0 for off
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admins',1);
