"""Generate messy Buildium-style CSVs and zip them."""
import csv
import random
import zipfile
import io
import os
from datetime import date, timedelta

random.seed(42)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "data")
os.makedirs(OUT_DIR, exist_ok=True)

def rand_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days))

def fmt_date(d, style="us"):
    if style == "us":
        return d.strftime("%m/%d/%Y")
    return d.strftime("%Y-%m-%d")

# ─── Fabricated names (clearly fictional) ───────────────────────────────────
FIRST_NAMES = [
    "Zorbax", "Velindra", "Quillon", "Saffira", "Tormundo", "Brixelle",
    "Wyndham", "Ossian", "Fendrick", "Lurielle", "Creston", "Alvadine",
    "Pyrrhus", "Selwyn", "Tanaquil", "Borveth", "Gwendrix", "Iphigex",
    "Mordacai", "Xanthela", "Cobrin", "Dorrith", "Elspex", "Finthorn",
    "Gavindrel", "Hestorix", "Imelva", "Jorrax", "Kinveth", "Lorndar",
    "Morthis", "Neldrix", "Ophrix", "Porrith", "Quendara", "Relvox",
    "Straxis", "Thurnex", "Ulvindra", "Vorbell", "Wendrix", "Xolvane",
    "Yorreth", "Zindrel", "Abrivax", "Belroth", "Corvellin", "Draxis",
    "Estrith", "Falvorn",
]
LAST_NAMES = [
    "Vanthorpe", "Quilbridge", "Stormwick", "Brindlewood", "Croxford",
    "Delvarne", "Erzwick", "Foldgate", "Grimbane", "Halvorn", "Irrelwick",
    "Jolvex", "Korbridge", "Larwick", "Morthane", "Nelvorth", "Oxbridge",
    "Prelvane", "Quorwick", "Rorbane", "Slornwick", "Torvelwick", "Urnwick",
    "Velbane", "Wolvwick", "Xorvane", "Yorwick", "Zolbane", "Abrivane",
    "Beldwick", "Crolvorn", "Dorbane", "Elvwick", "Forwick", "Grelvane",
    "Horwick", "Imvane", "Jorvane", "Kolvorn", "Lormwick", "Melvane",
    "Norwick", "Orvane", "Polvwick", "Qorvane", "Rolwick", "Solwick",
    "Torwick", "Ulvane",
]

def fake_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)

def fake_email(first, last):
    domains = ["fakemail.test", "notreal.example", "synthetic.invalid", "placeholder.test", "invented.example"]
    return f"{first.lower()}.{last.lower()}@{random.choice(domains)}"

def fake_phone():
    return f"555-{random.randint(100,999)}-{random.randint(1000,9999)}"

PROPERTY_NAMES = [
    "Hypothetical Heights", "Fictional Plaza", "Invented Commons",
    "Synthetic Tower", "Bogus Building", "Contrived Court",
    "Fabricated Flats", "Notreal Residences", "Phantom Park",
    "Ersatz Estates",
]

VENDORS = [
    "Fictitious HVAC Co.", "Synthetic Plumbing LLC", "Notreal Electric Inc.",
    "Placeholder Painters", "Invented Carpentry", "Bogus Glazing Corp.",
    "O'Malley & Sons", "Phantom Flooring", "Contrived Roofing",
]

WO_CATEGORIES = ["plumbing", "electrical", "hvac", "appliance", "flooring", "painting", "pest_control", "general"]
WO_DESCRIPTIONS = [
    "Leaking faucet in kitchen sink",
    "Replace HVAC filter and clean coils",
    "Fix broken outlet in bedroom",
    "Repair cracked tile in bathroom",
    "Touch-up painting in living room",
    "Replace garbage disposal unit",
    "Seal gap around front door frame",
    "Reparación de tubería en baño principal",
    "Reemplazo de ventana rota en dormitorio",
    "Inspección de sistema de calefacción central",
    "Carpet stain removal in hallway",
    "Fix sticky sliding door on balcony",
]

# ─── TENANTS (150 rows) ──────────────────────────────────────────────────────
tenants = []
tenant_ids = [f"T{str(i).zfill(4)}" for i in range(1, 148)]  # 147 unique + 3 duplicates = 150
used_emails = {}

statuses = (["active"] * 70) + (["past"] * 50) + (["prospect"] * 30)
random.shuffle(statuses)

dob_start = date(1950, 1, 1)
dob_end = date(2000, 12, 31)

for idx, tid in enumerate(tenant_ids):
    fn, ln = fake_name()
    # date style: 70% US, 30% ISO
    dstyle = "us" if random.random() < 0.7 else "iso"
    dob = rand_date(dob_start, dob_end)
    email = fake_email(fn, ln)
    phone = fake_phone() if idx not in [10, 27, 45, 88, 110] else ""
    status = statuses[idx]
    note = random.choice(["", "", "", "Late payer", "Long-term tenant", "Referred by agent", "Corporate lease"])

    tenants.append({
        "tenant_id": tid,
        "first_name": fn,
        "last_name": ln,
        "email": email,
        "phone": phone,
        "date_of_birth": fmt_date(dob, dstyle),
        "status": status,
        "notes": note,
    })
    used_emails[email] = tid

# 3 duplicate email rows (same email, different tenant_id) — rows 148-150
dup_source = [tenants[5]["email"], tenants[22]["email"], tenants[61]["email"]]
for i, dup_email in enumerate(dup_source):
    fn2, ln2 = fake_name()
    tenants.append({
        "tenant_id": f"T{str(148 + i).zfill(4)}",
        "first_name": fn2,
        "last_name": ln2,
        "email": dup_email,  # deliberate duplicate
        "phone": fake_phone(),
        "date_of_birth": fmt_date(rand_date(dob_start, dob_end), "us"),
        "status": "prospect",
        "notes": "Duplicate email — data entry error",
    })  # total = 150

# 2 malformed emails
tenants[33]["email"] = "malformed-no-at-sign.fakemail.test"
tenants[77]["email"] = "anotherbadone[at]notreal.example"

# 1 em-dash in last name
tenants[12]["last_name"] = "Vanthorpe\u2014Stormwick"

# ─── UNITS (45 rows) ─────────────────────────────────────────────────────────
units = []
unit_ids = [f"U{str(i).zfill(3)}" for i in range(1, 46)]
unit_statuses = (["occupied"] * 28) + (["vacant"] * 12) + (["off_market"] * 5)
random.shuffle(unit_statuses)

for idx, uid in enumerate(unit_ids):
    prop = random.choice(PROPERTY_NAMES)
    unit_num = f"{random.randint(1,40)}{random.choice(['A','B','C','D',''])}"
    beds = random.choice([0, 1, 1, 2, 2, 2, 3, 3, 4])
    baths = round(random.choice([1, 1, 1.5, 2, 2, 2.5, 3]), 1)
    sqft = random.randint(450, 3500)
    rent = random.choice([None if idx == 22 else round(random.randint(1800, 12000), -2)])
    status = unit_statuses[idx]

    units.append({
        "unit_id": uid,
        "property_name": prop,
        "unit_number": unit_num,
        "bedrooms": beds,
        "bathrooms": baths,
        "square_feet": sqft,
        "monthly_rent_target": rent,
        "status": status,
    })

# NULL rent on row 22 (index 22)
units[22]["monthly_rent_target"] = ""

# 2 negative square_feet
units[7]["square_feet"] = -120
units[31]["square_feet"] = -5

# 3 units with property_name variations (same building, different strings)
units[0]["property_name"] = "1234 Elm St"
units[14]["property_name"] = "1234 Elm Street"
units[29]["property_name"] = "1234 Elm St."

# ─── LEASES (130 rows) ───────────────────────────────────────────────────────
leases = []
lease_ids = [f"L{str(i).zfill(4)}" for i in range(1, 131)]
lease_statuses = (["active"] * 55) + (["ended"] * 40) + (["renewed"] * 20) + (["terminated_early"] * 15)
random.shuffle(lease_statuses)

valid_tenant_ids = [t["tenant_id"] for t in tenants[:150]]  # exclude the 3 duplicates we added
valid_unit_ids = [u["unit_id"] for u in units]

lease_start_range = (date(2019, 1, 1), date(2025, 6, 1))

for idx, lid in enumerate(lease_ids):
    tid = random.choice(valid_tenant_ids)
    uid = random.choice(valid_unit_ids)
    start = rand_date(*lease_start_range)
    end = start + timedelta(days=random.choice([365, 365, 365, 730, 548, 913]))
    rent = round(random.randint(1800, 12000), -2)
    deposit = rent * random.choice([1, 1, 1, 2])
    status = lease_statuses[idx]

    leases.append({
        "lease_id": lid,
        "tenant_id": tid,
        "unit_id": uid,
        "start_date": fmt_date(start, "us"),
        "end_date": fmt_date(end, "us"),
        "monthly_rent": rent,
        "security_deposit": deposit,
        "status": status,
    })

# 8 orphan tenant_ids not in tenants.csv
orphan_tids = [f"T{str(i).zfill(4)}" for i in range(9000, 9008)]
for i in range(8):
    leases[120 + i]["tenant_id"] = orphan_tids[i]

# 4 leases with end_date before start_date
for i in [5, 18, 44, 71]:
    s = rand_date(date(2020, 1, 1), date(2024, 1, 1))
    leases[i]["start_date"] = fmt_date(s + timedelta(days=200), "us")
    leases[i]["end_date"] = fmt_date(s, "us")

# 2 overlapping leases on same unit_id
leases[60]["unit_id"] = "U001"
leases[61]["unit_id"] = "U001"
leases[60]["start_date"] = "01/01/2023"
leases[60]["end_date"] = "12/31/2023"
leases[61]["start_date"] = "06/01/2023"
leases[61]["end_date"] = "05/31/2024"

# ─── CHARGES (800 rows) ──────────────────────────────────────────────────────
charges = []
charge_ids = [f"CH{str(i).zfill(5)}" for i in range(1, 801)]
charge_types = ["rent", "late_fee", "utility", "repair_chargeback", "pet_fee"]
charge_descs = {
    "rent": "Monthly rent",
    "late_fee": "Late payment fee",
    "utility": "Water/electric utility recharge",
    "repair_chargeback": "Repair chargeback per lease §12",
    "pet_fee": "Monthly pet fee",
}
charge_date_range = (date(2023, 1, 1), date(2026, 4, 1))
valid_lease_ids = [l["lease_id"] for l in leases]

for idx, cid in enumerate(charge_ids):
    lid = random.choice(valid_lease_ids)
    ctype = random.choice(charge_types)
    amount = round(random.uniform(25, 5000), 2)
    cdate = rand_date(*charge_date_range)

    charges.append({
        "charge_id": cid,
        "lease_id": lid,
        "charge_date": fmt_date(cdate, "us"),
        "amount": amount,
        "type": ctype,
        "description": charge_descs[ctype],
    })

# 12 orphan lease_ids
orphan_lids = [f"L{str(i).zfill(4)}" for i in range(9000, 9012)]
for i in range(12):
    charges[780 + i]["lease_id"] = orphan_lids[i]

# 3 negative amounts
charges[10]["amount"] = -50.00
charges[200]["amount"] = -125.00
charges[555]["amount"] = -300.00

# ─── PAYMENTS (650 rows) ─────────────────────────────────────────────────────
payments = []
payment_ids = [f"P{str(i).zfill(5)}" for i in range(1, 651)]
pay_methods = ["check", "ach", "credit_card", "cash"]
pay_date_range = (date(2023, 1, 1), date(2026, 4, 1))

for idx, pid in enumerate(payment_ids):
    lid = random.choice(valid_lease_ids)
    pdate = rand_date(*pay_date_range)
    amount = round(random.uniform(500, 12000), 2)
    method = random.choice(pay_methods)

    payments.append({
        "payment_id": pid,
        "lease_id": lid,
        "payment_date": fmt_date(pdate, "us"),
        "amount": amount,
        "method": method,
        "notes": "",
    })

# 5 orphan lease_ids
orphan_plids = [f"L{str(i).zfill(4)}" for i in range(9100, 9105)]
for i in range(5):
    payments[640 + i]["lease_id"] = orphan_plids[i]

# 2 zero-amount payments
payments[33]["amount"] = 0
payments[199]["amount"] = 0

# 4 split payments (same tenant-day, two rows)
for base in [50, 150, 300, 450]:
    shared_lid = random.choice(valid_lease_ids)
    shared_date = fmt_date(rand_date(*pay_date_range), "us")
    payments[base]["lease_id"] = shared_lid
    payments[base]["payment_date"] = shared_date
    payments[base]["notes"] = "Split payment part 1 of 2"
    payments[base + 1]["lease_id"] = shared_lid
    payments[base + 1]["payment_date"] = shared_date
    payments[base + 1]["notes"] = "Split payment part 2 of 2"

# ─── WORK ORDERS (60 rows) ───────────────────────────────────────────────────
work_orders = []
wo_ids = [f"WO{str(i).zfill(4)}" for i in range(1, 61)]
wo_statuses_pool = (["open"] * 10) + (["in_progress"] * 15) + (["completed"] * 30) + (["cancelled"] * 5)
random.shuffle(wo_statuses_pool)
wo_date_range = (date(2023, 1, 1), date(2026, 4, 1))

for idx, wid in enumerate(wo_ids):
    uid = random.choice(valid_unit_ids)
    opened = rand_date(*wo_date_range)
    status = wo_statuses_pool[idx]
    closed = fmt_date(opened + timedelta(days=random.randint(1, 120)), "us") if status in ["completed", "cancelled"] else ""
    cat = random.choice(WO_CATEGORIES)
    desc = random.choice(WO_DESCRIPTIONS[:9])  # first 9 are English
    vendor = random.choice(VENDORS)
    cost = round(random.uniform(50, 8000), 2)

    work_orders.append({
        "work_order_id": wid,
        "unit_id": uid,
        "opened_date": fmt_date(opened, "us"),
        "closed_date": closed,
        "status": status,
        "category": cat,
        "description": desc,
        "vendor_name": vendor,
        "cost": cost,
    })

# 5 open work orders with no closed_date (already guaranteed by logic above for "open")
# Force 5 specific ones to be open
for i in [0, 1, 2, 3, 4]:
    work_orders[i]["status"] = "open"
    work_orders[i]["closed_date"] = ""

# 3 Spanish descriptions
work_orders[10]["description"] = "Reparación de tubería en baño principal"
work_orders[25]["description"] = "Reemplazo de ventana rota en dormitorio"
work_orders[40]["description"] = "Inspección de sistema de calefacción central"

# O'Malley & Sons vendor
work_orders[15]["vendor_name"] = "O'Malley & Sons"

# 2 negative costs
work_orders[8]["cost"] = -75.00
work_orders[33]["cost"] = -200.00

# ─── Write CSVs to zip ───────────────────────────────────────────────────────
def write_csv(rows, fieldnames):
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")

zip_path = os.path.join(OUT_DIR, "buildium_export.zip")

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("tenants.csv", write_csv(tenants, ["tenant_id","first_name","last_name","email","phone","date_of_birth","status","notes"]))
    zf.writestr("units.csv", write_csv(units, ["unit_id","property_name","unit_number","bedrooms","bathrooms","square_feet","monthly_rent_target","status"]))
    zf.writestr("leases.csv", write_csv(leases, ["lease_id","tenant_id","unit_id","start_date","end_date","monthly_rent","security_deposit","status"]))
    zf.writestr("charges.csv", write_csv(charges, ["charge_id","lease_id","charge_date","amount","type","description"]))
    zf.writestr("payments.csv", write_csv(payments, ["payment_id","lease_id","payment_date","amount","method","notes"]))
    zf.writestr("work_orders.csv", write_csv(work_orders, ["work_order_id","unit_id","opened_date","closed_date","status","category","description","vendor_name","cost"]))

print(f"Written: {zip_path}")
print(f"  tenants.csv:     {len(tenants)} rows")
print(f"  units.csv:       {len(units)} rows")
print(f"  leases.csv:      {len(leases)} rows")
print(f"  charges.csv:     {len(charges)} rows")
print(f"  payments.csv:    {len(payments)} rows")
print(f"  work_orders.csv: {len(work_orders)} rows")
