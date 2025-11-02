# Habilitar Ethereum Mainnet en Alchemy

## Error Encontrado
```
ETH_MAINNET is not enabled for this app
```

## Solución Rápida

### Opción 1: Link Directo
Ve directamente a tu app y habilita Mainnet:
**https://dashboard.alchemy.com/apps/8rb9urp5m6blu9ma/networks**

### Opción 2: Paso a Paso

1. **Ve al Dashboard de Alchemy**
   - https://dashboard.alchemy.com/
   - Inicia sesión

2. **Selecciona tu App**
   - Busca la app que tiene la API key `gkuW9Fqbyb7-to0mEFOBf`
   - Haz clic en ella

3. **Habilita Ethereum Mainnet**
   - Busca la sección "Networks" o "Settings"
   - Encuentra "Ethereum Mainnet"
   - Activa el toggle o haz clic en "Enable"

4. **Espera la Activación**
   - Puede tardar unos segundos
   - Verás una confirmación cuando esté listo

5. **Vuelve a Intentar el Deployment**
   ```bash
   cd contracts
   npm run deploy:mainnet
   ```

## Verificación

Si ya tienes otra app con Mainnet habilitado, puedes:
1. Usar esa API key en su lugar, o
2. Habilitar Mainnet en la app actual

## Nota

Las apps de Alchemy por defecto tienen habilitadas solo ciertas redes. Para usar Mainnet en producción, necesitas habilitarla explícitamente.

