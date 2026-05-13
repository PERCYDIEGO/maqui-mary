#!/usr/bin/env node
/**
 * Script para verificar el estado de la base de datos
 * Muestra conteos de todas las tablas principales
 * 
 * Uso:
 *   node scripts/check-db-status.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   Asegúrate de tener .env.local con las credenciales de Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

async function checkTableCount(tableName) {
    try {
        const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            if (error.message.includes('does not exist')) {
                return { exists: false, count: 0, error: null };
            }
            return { exists: true, count: null, error: error.message };
        }
        
        return { exists: true, count, error: null };
    } catch (e) {
        return { exists: false, count: 0, error: e.message };
    }
}

async function showStatus() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}${colors.cyan}📊 ESTADO DE LA BASE DE DATOS - Maqui Mary CRM${colors.reset}`);
    console.log('='.repeat(70) + '\n');
    
    const timestamp = new Date().toLocaleString('es-PE', {
        dateStyle: 'full',
        timeStyle: 'short'
    });
    console.log(`🕐 Fecha: ${timestamp}\n`);
    
    // Configuración
    console.log(`${colors.bold}⚙️  CONFIGURACIÓN:${colors.reset}\n`);
    const configTables = ['configuracion', 'profiles', 'usuarios'];
    for (const table of configTables) {
        const { exists, count, error } = await checkTableCount(table);
        if (exists) {
            const color = count > 0 ? colors.green : colors.yellow;
            console.log(`   ${color}✓ ${table}: ${count} registros${colors.reset}`);
        }
    }
    
    // Catálogo
    console.log(`\n${colors.bold}📦 CATÁLOGO:${colors.reset}\n`);
    const catalogTables = ['productos', 'clientes', 'categorias'];
    for (const table of catalogTables) {
        const { exists, count, error } = await checkTableCount(table);
        if (exists) {
            const color = count > 0 ? colors.green : colors.yellow;
            console.log(`   ${color}✓ ${table}: ${count} registros${colors.reset}`);
        }
    }
    
    // Facturas (DESTACADO)
    console.log(`\n${colors.bold}📄 FACTURAS:${colors.reset}`);
    const facturaTables = [
        { name: 'facturas', label: 'Facturas' },
        { name: 'factura_items', label: 'Items de Facturas' },
        { name: 'facturas_pendientes', label: 'Facturas Pendientes' }
    ];
    
    let totalFacturas = 0;
    for (const { name, label } of facturaTables) {
        const { exists, count, error } = await checkTableCount(name);
        if (exists) {
            totalFacturas += count || 0;
            const color = count > 0 ? colors.cyan : colors.green;
            console.log(`   ${color}• ${label}: ${count} registros${colors.reset}`);
        } else {
            console.log(`   ${colors.yellow}○ ${label}: tabla no existe${colors.reset}`);
        }
    }
    
    // Pedidos (DESTACADO)
    console.log(`\n${colors.bold}🛒 PEDIDOS:${colors.reset}`);
    const pedidoTables = [
        { name: 'pedidos', label: 'Pedidos' },
        { name: 'pedido_items', label: 'Items de Pedidos' }
    ];
    
    let totalPedidos = 0;
    for (const { name, label } of pedidoTables) {
        const { exists, count, error } = await checkTableCount(name);
        if (exists) {
            totalPedidos += count || 0;
            const color = count > 0 ? colors.cyan : colors.green;
            console.log(`   ${color}• ${label}: ${count} registros${colors.reset}`);
        } else {
            console.log(`   ${colors.yellow}○ ${label}: tabla no existe${colors.reset}`);
        }
    }
    
    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}📊 RESUMEN:${colors.reset}\n`);
    
    if (totalFacturas === 0 && totalPedidos === 0) {
        console.log(`${colors.green}✨ La base de datos está LIMPIA${colors.reset}`);
        console.log(`   No hay facturas ni pedidos registrados\n`);
        console.log(`${colors.bold}💡 Próximos pasos:${colors.reset}`);
        console.log(`   • Crear facturas desde el CRM`);
        console.log(`   • Sincronizar desde la app móvil`);
        console.log(`   • Usar: npm run db:truncate para limpiar datos de prueba\n`);
    } else {
        console.log(`${colors.yellow}📦 Total Facturas: ${totalFacturas} registros${colors.reset}`);
        console.log(`${colors.yellow}🛒 Total Pedidos: ${totalPedidos} registros${colors.reset}`);
        console.log(`\n${colors.bold}💡 Comandos útiles:${colors.reset}`);
        console.log(`   • npm run db:truncate:dry - Ver qué se eliminará`);
        console.log(`   • npm run db:truncate - Limpiar TODO (requiere confirmación)\n`);
    }
    
    console.log('='.repeat(70) + '\n');
}

// Ejecutar
showStatus().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});
