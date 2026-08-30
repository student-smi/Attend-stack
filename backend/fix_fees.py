"""Fix fee_type enum issue - run once on production DB"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Delete old records with removed fee types
    conn.execute(text("DELETE FROM fee_payments WHERE fee_type IN ('Exam', 'Library', 'Other')"))
    conn.commit()
    
    result = conn.execute(text("SELECT COUNT(*) FROM fee_payments"))
    print(f"Remaining fee records: {result.scalar()}")
    
    result2 = conn.execute(text("SELECT fee_type, COUNT(*) FROM fee_payments GROUP BY fee_type"))
    for row in result2:
        print(f"  {row[0]}: {row[1]}")

print("Done!")
