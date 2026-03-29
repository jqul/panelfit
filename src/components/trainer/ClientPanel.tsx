if (planData?.datos?.P) {
  // Your code here...
}

if (regData?.datos?.logs) {
  // Your code here...
}

const updatedData = {
  cliente_id: cliente_id,
  datos: datos,
  updated_at: new Date().toISOString(),
  onConflict: 'cliente_id',
};

// Your further code here...