import urllib.request
import json

def test_api():
    # 1. Spots
    with urllib.request.urlopen('http://localhost:5000/api/spots') as resp:
        spots = json.loads(resp.read().decode())
        print(f"1. Spots count: {len(spots)}")

    if len(spots) < 2:
        print("Error: Need at least 2 pooling spots to test routes.")
        return

    origin_id = spots[0]['id']
    dest_id = spots[1]['id']
    print(f"Testing route: {spots[0]['name']} (id={origin_id}) -> {spots[1]['name']} (id={dest_id})")

    # 2. Schedules
    travel_date = '2026-11-20'
    with urllib.request.urlopen(f'http://localhost:5000/api/schedules?origin={origin_id}&destination={dest_id}&date={travel_date}') as resp:
        schedules = json.loads(resp.read().decode())
        print(f"2. Schedules count: {len(schedules)}, Price: Rp {schedules[0]['price']:,}, Available Seats: {schedules[0]['available_seats_count']}")

    # 3. Create Booking
    payload = {
        'schedule_id': schedules[0]['id'],
        'travel_date': travel_date,
        'customer_name': 'Rian Pratama',
        'customer_phone': '+62 812-9999-1122',
        'customer_email': 'rian.pratama@example.com',
        'auth_method': 'phone',
        'seat_numbers': ['3A', '3B']
    }

    req = urllib.request.Request(
        'http://localhost:5000/api/bookings',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        booking = json.loads(resp.read().decode())
        print(f"3. Booking created successfully!")
        print(f"   Code: {booking['booking_code']}")
        print(f"   Seats: {booking['seat_numbers']}")
        print(f"   Total: Rp {booking['total_price']:,}")
        print(f"   Payment: {booking['payment_method']} ({booking['payment_status']})")

    # 4. Operator Login to access protected analytics
    login_req = urllib.request.Request(
        'http://localhost:5000/api/business/login',
        data=json.dumps({'username': 'admin', 'password': 'antarpool2026'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as resp:
        login_data = json.loads(resp.read().decode())
        token = login_data['token']

    # 5. Analytics (Protected)
    analytics_req = urllib.request.Request(
        'http://localhost:5000/api/business/analytics',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(analytics_req) as resp:
        stats = json.loads(resp.read().decode())
        print(f"5. Analytics updated:")
        print(f"   Total Bookings: {stats['total_bookings']}")
        print(f"   Pending Revenue: Rp {stats['pending_revenue']:,}")
        if stats['top_routes']:
            print(f"   Top Route: {stats['top_routes'][0]['route_name']} ({stats['top_routes'][0]['booking_count']} orders)")

if __name__ == '__main__':
    test_api()
