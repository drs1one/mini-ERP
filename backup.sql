PRAGMA defer_foreign_keys=TRUE;

-- Drop existing tables safely in reverse order of foreign key dependencies
DROP TABLE IF EXISTS worker_task_logs;
DROP TABLE IF EXISTS production_orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS time_sessions;
DROP TABLE IF EXISTS weekly_schedules;
DROP TABLE IF EXISTS weekly_schedule_template;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL
);

INSERT INTO "admins" ("id","username","password") VALUES(1,'test','test');

CREATE TABLE employees (
                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                           matricule TEXT UNIQUE NOT NULL, -- Internal ID code for your reference
                           name TEXT NOT NULL,
                           hourly_rate REAL DEFAULT 0,
                           has_transport INTEGER DEFAULT 0, -- 1 = Yes, 0 = No
                           transport_allowance REAL DEFAULT 0,
                           prime REAL DEFAULT 0,
                           advance REAL DEFAULT 0,
                           credit REAL DEFAULT 0,
                           weekly_hours REAL DEFAULT 0,
                           gross_salary REAL DEFAULT 0,
                           total_net REAL DEFAULT 0
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
                                          day_of_week TEXT UNIQUE NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
                                          block1_in TEXT,
                                          block1_out TEXT,
                                          block2_in TEXT,
                                          block2_out TEXT,
                                          block3_in TEXT,
                                          block3_out TEXT,
                                          is_working_day BOOLEAN DEFAULT 1
);

DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admins',1);