import urllib.request
import json

def test_api():
    # 1. Spots
    with urllib.request.urlopen('http://localhost:5000/api/spots') as resp:
        spots = json.loads(resp.read().decode())
        print(f"1. Spots count: {len(spots)}")

    # Pool Senayan City (id=1) -> Pool Dipatiukur (id=4)
    origin_id = 1
    dest_id = 4

    # 2. Schedules
    with urllib.request.urlopen(f'http://localhost:5000/api/schedules?origin={origin_id}&destination={dest_id}') as resp:
        schedules = json.loads(resp.read().decode())
        print(f"2. Schedules count: {len(schedules)}, Price: Rp {schedules[0]['price']:,}, Available Seats: {schedules[0]['available_seats_count']}")

    # 3. Create Booking
    payload = {
        'schedule_id': schedules[0]['id'],
        'travel_date': '2026-09-22',
        'customer_name': 'Rian Pratama',
        'customer_phone': '+62 812-9999-1122',
        'customer_email': 'rian.pratama@example.com',
        'auth_method': 'phone',
        'seat_numbers': ['2A', '2B']
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

    # 4. Analytics
    with urllib.request.urlopen('http://localhost:5000/api/business/analytics') as resp:
        stats = json.loads(resp.read().decode())
        print(f"4. Analytics updated:")
        print(f"   Total Bookings: {stats['total_bookings']}")
        print(f"   Pending Revenue: Rp {stats['pending_revenue']:,}")
        print(f"   Top Route: {stats['top_routes'][0]['route_name']} ({stats['top_routes'][0]['booking_count']} orders)")

if __name__ == '__main__':
    test_api()
