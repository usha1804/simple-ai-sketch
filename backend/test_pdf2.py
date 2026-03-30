from pipeline import paths_to_pdf_bytes

r = paths_to_pdf_bytes([[[10,10],[50,50],[100,30]]], 800, 600)
print('PDF bytes:', len(r))

if len(r) > 0:
    print('PDF OK - writing test_output.pdf')
    with open('test_output.pdf', 'wb') as f:
        f.write(r)
else:
    print('PDF FAILED - returned 0 bytes')