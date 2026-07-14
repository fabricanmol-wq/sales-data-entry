import sys
with open('src/main/java/com/salesdata/controller/SalesRecordController.java', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(115, 145):
    print(f"{j+1}: {lines[j]}", end='')
