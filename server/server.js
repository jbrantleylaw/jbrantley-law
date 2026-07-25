require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/contacts',  require('./routes/contacts'));
app.use('/api/matters',   require('./routes/matters'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/events',    require('./routes/events'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/intake',       require('./routes/intake'));
app.use('/api/doc-library',  require('./routes/docLibrary'));
app.use('/api/billing',          require('./routes/billing'));
app.use('/api/ppexport',         require('./routes/ppexport'));
app.use('/api/settings',         require('./routes/settings'));
app.use('/api/ppimport',         require('./routes/ppimport'));
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/calendly',         require('./routes/calendly'));
app.use('/api/google',           require('./routes/google'));
app.use('/api/esignature',       require('./routes/esignature'));
app.use('/api/adobe-sign-webhook', require('./routes/adobe-sign-webhook'));
app.use('/api/messages',         require('./routes/messages'));
app.use('/api/workflows',        require('./routes/workflows'));
app.use('/api/time-entries',     require('./routes/timeentries'));
app.use('/api/notifications',    require('./routes/notifications'));
app.use('/api/notes',            require('./routes/notes'));
app.use('/api/activity',         require('./routes/activity'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => console.log(`J Brantley Law server running on port ${PORT}`));
