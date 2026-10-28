EDGORIA 4.0.7 - Parche de diagnóstico privado.

SOLO reemplazar server/supabase.js en la raíz del repositorio privado GitHub (rama main).
NO copiar claves a GitHub ni a este archivo.

Se validan URL y claves privadas de forma segura, se eliminan espacios y se admiten alternativas válidas.
Si persiste HTTP 503, consultar Logs Vercel por EDGORIA_PRIVATE_ENV_CHECK.
Todos los campos del log son indicadores booleanos, nunca valores de credenciales.
Si validPrivateKeyFormat=false, abrir Vercel Project Settings > Environment Variables y revisar desde el propio panel que SUPABASE_SECRET_KEY contenga clave sb_secret_ válida, o SUPABASE_SERVICE_ROLE_KEY contenga la credencial legacy correcta. Si secretKeyPresent=false y serviceRoleKeyPresent=false, faltan ambas variables en el entorno del despliegue.

No cambia Supabase ni los datos almacenados.
