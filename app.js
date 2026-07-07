// API base URL. Defaults to the local backend; can be overridden at runtime
// (e.g. by an injected <script>window.__API_BASE__ = "..."</script> in index.html).
const API_BASE = (window.__API_BASE__ || 'http://localhost:5000').replace(/\/$/, '');

const reservationForm = document.getElementById('reservation-form');
const lookupForm = document.getElementById('lookup-form');
const hotelSelect = document.getElementById('hotel');
const reservationMessage = document.getElementById('reservation-message');
const lookupMessage = document.getElementById('lookup-message');
const lookupResults = document.getElementById('lookup-results');
const views = document.querySelectorAll('.view');
const tabs = document.querySelectorAll('.tab-button');

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    /* response had no JSON body */
  }
  return { ok: response.ok, status: response.status, data };
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}

function switchView(viewName) {
  views.forEach((view) => {
    view.classList.toggle('active', view.id === viewName);
  });
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });
}

// Populate the hotel dropdown from GET /hotels.
async function loadHotels() {
  hotelSelect.innerHTML = '<option value="">Loading hotels…</option>';
  try {
    const { ok, data } = await api('/hotels');
    if (!ok || !Array.isArray(data)) {
      hotelSelect.innerHTML = '<option value="">Failed to load hotels</option>';
      return;
    }
    if (data.length === 0) {
      hotelSelect.innerHTML = '<option value="">No hotels available</option>';
      return;
    }
    hotelSelect.innerHTML = '<option value="">Select a hotel</option>';
    data.forEach((hotel) => {
      const option = document.createElement('option');
      option.value = hotel.hotel_id;
      const price = hotel.price_per_night ? ` ($${hotel.price_per_night}/night)` : '';
      const location = hotel.location ? ` — ${hotel.location}` : '';
      option.textContent = `${hotel.name}${location}${price}`;
      hotelSelect.appendChild(option);
    });
  } catch (err) {
    hotelSelect.innerHTML = '<option value="">Backend unreachable</option>';
  }
}

// Function 1 – Create Reservation (POST /reservations)
async function handleReservationSubmit(event) {
  event.preventDefault();

  const formData = new FormData(reservationForm);
  const payload = {
    hotel_id: hotelSelect.value,
    full_name: (formData.get('fullName') || '').toString().trim(),
    email: (formData.get('email') || '').toString().trim(),
    check_in_date: (formData.get('checkIn') || '').toString(),
    check_out_date: (formData.get('checkOut') || '').toString(),
  };

  if (!payload.hotel_id || !payload.full_name || !payload.email ||
      !payload.check_in_date || !payload.check_out_date) {
    showMessage(reservationMessage, 'Please complete every field.', 'error');
    return;
  }
  if (new Date(payload.check_out_date) <= new Date(payload.check_in_date)) {
    showMessage(reservationMessage, 'Check-out date must be after the check-in date.', 'error');
    return;
  }

  try {
    const { ok, data } = await api('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!ok) {
      showMessage(reservationMessage, (data && data.error) || 'Failed to create reservation.', 'error');
      return;
    }
    const id = data.reservation.reservation_id;
    reservationForm.reset();
    showMessage(
      reservationMessage,
      `Reservation created successfully. Your Reservation ID: ${id} (keep it to look up or cancel).`,
      'success',
    );
  } catch (err) {
    showMessage(reservationMessage, 'Could not reach the backend.', 'error');
  }
}

function renderReservation(reservation) {
  lookupResults.innerHTML = '';
  const item = document.createElement('article');
  item.className = 'result-item';
  item.innerHTML = `
    <h3>${reservation.full_name}</h3>
    <p><strong>Reservation ID:</strong> ${reservation.reservation_id}</p>
    <p><strong>Email:</strong> ${reservation.email}</p>
    <p><strong>Hotel ID:</strong> ${reservation.hotel_id}</p>
    <p><strong>Check-In:</strong> ${reservation.check_in_date}</p>
    <p><strong>Check-Out:</strong> ${reservation.check_out_date}</p>
    <button class="cancel-btn" data-id="${reservation.reservation_id}">Cancel Reservation</button>
  `;
  lookupResults.appendChild(item);
}

// Function 2 – Reservation Lookup (GET /reservations/<id>)
async function handleLookupSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('lookupTerm').value.trim();
  if (!id) {
    showMessage(lookupMessage, 'Please enter a Reservation ID.', 'error');
    lookupResults.innerHTML = '';
    return;
  }

  try {
    const { ok, status, data } = await api(`/reservations/${encodeURIComponent(id)}`);
    if (!ok) {
      lookupResults.innerHTML = '';
      const text = status === 404 ? 'No reservation found.' : ((data && data.error) || 'Lookup failed.');
      showMessage(lookupMessage, text, 'error');
      return;
    }
    showMessage(lookupMessage, 'Reservation found.', 'success');
    renderReservation(data);
  } catch (err) {
    showMessage(lookupMessage, 'Could not reach the backend.', 'error');
  }
}

// Function 3 – Cancel Reservation (DELETE /reservations/<id>)
async function handleCancelReservation(event) {
  const button = event.target.closest('.cancel-btn');
  if (!button) {
    return;
  }
  const id = button.dataset.id;
  try {
    const { ok, data } = await api(`/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!ok) {
      showMessage(lookupMessage, (data && data.error) || 'Cancellation failed.', 'error');
      return;
    }
    lookupResults.innerHTML = '';
    showMessage(lookupMessage, 'Reservation cancelled successfully.', 'success');
  } catch (err) {
    showMessage(lookupMessage, 'Could not reach the backend.', 'error');
  }
}

loadHotels();
reservationForm.addEventListener('submit', handleReservationSubmit);
lookupForm.addEventListener('submit', handleLookupSubmit);
lookupResults.addEventListener('click', handleCancelReservation);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

switchView('new-reservation');
