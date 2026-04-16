<!DOCTYPE html>
<html>
<body style="background: #0a4519; color: white; font-family: sans-serif; text-align: center; padding-top: 100px;">
    <h1>Mutare GIS Setup</h1>
    <div style="background: white; color: #333; padding: 30px; display: inline-block; border-radius: 12px; width: 350px;">
        <input id="host" placeholder="Host (localhost)" style="width:90%; padding:10px; margin:5px;">
        <input id="user" placeholder="Postgres Username" style="width:90%; padding:10px; margin:5px;">
        <input id="pass" type="password" placeholder="Password" style="width:90%; padding:10px; margin:5px;">
        <input id="db" placeholder="Database Name" style="width:90%; padding:10px; margin:5px;">
        <button onclick="connect()" style="width:96%; padding:10px; background:#a7c957; border:none; font-weight:bold; cursor:pointer; margin-top:10px;">INITIALIZE SYSTEM</button>
    </div>
    <script>
        const { ipcRenderer } = require('electron');
        async function connect() {
            const config = { host: document.getElementById('host').value, user: document.getElementById('user').value, 
                             password: document.getElementById('pass').value, database: document.getElementById('db').value, port: 5432 };
            const res = await ipcRenderer.invoke('setup-db', config);
            if(res.success) window.location.href = 'index.html';
            else alert("Error: " + res.error);
        }
    </script>
</body>
</html>
