#!/usr/bin/env node
/**
 * Script para limpiar la base de datos de Maqui Mary
 * Borra TODAS las facturas y pedidos
 * 
 * Uso:
 *   node scripts/clean-database.mjs
 *   node scripts/clean-database.mjs --confirm
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Colores para consola
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

async function countRecords() {
    console.log('\n📊 Contando registros actuales...\n');
    
    const tables = [
        { name: 'facturas', label: 'Facturas' },
        { name: 'factura_items', label: 'Items de Facturas' },
        { name: 'pedidos', label: 'Pedidos' },
        { name: 'pedido_items', label: 'Items de Pedidos' }
    ];
    
    const counts = {};
    
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`${colors.yellow}⚠️  ${table.label}:${colors.reset} Error al consultar - ${error.message}`);
            counts[table.name] = '?';
        } else {
            console.log(`${colors.blue}📋 ${table.label}:${colors.reset} ${count} registros`);
            counts[table.name] = count;
        }
    }
    
    const total = Object.values(counts).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
    console.log(`\n${colors.yellow}📦 Total de registros a eliminar: ${total}${colors.reset}\n`);
    
    return counts;
}

async function cleanTable(tableName, label) {
    console.log(`${colors.blue}🧹 Limpiando ${label}...${colors.reset}`);
    
    const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', 0); // Eliminar todos los registros
    
    if (error) {
        console.error(`${colors.red}❌ Error al limpiar ${label}:${colors.reset} ${error.message}`);
        return false;
    }
    
    // Verificar que se eliminaron
    const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
    
    if (count === 0) {
        console.log(`${colors.green}✅ ${label} limpiado correctamente${colors.reset}`);
        return true;
    } else {
        console.log(`${colors.yellow}⚠️  ${label}: ${count} registros restantes${colors.reset}`);
        return false;
    }
}

async function cleanDatabase() {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 LIMPIEZA DE BASE DE DATOS - Maqui Mary CRM');
    console.log('='.repeat(60) + '\n');
    
    // 1. Contar registros actuales
    const counts = await countRecords();
    
    const totalRecords = Object.values(counts).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
    
    if (totalRecords === 0) {
        console.log(`${colors.green}✨ La base de datos ya está limpia${colors.reset}\n`);
        return;
    }
    
    // 2. Confirmación
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm') || args.includes('-y');
    
    if (!confirmed) {
        console.log(`${colors.red}⚠️  ADVERTENCIA:${colors.reset}`);
        console.log('   Esta acción eliminará TODAS las facturas y pedidos permanentemente.');
        console.log('   Los productos, clientes y configuración NO se verán afectados.\n');
        console.log('   Para confirmar, ejecuta:');
        console.log(`   ${colors.yellow}node scripts/clean-database.mjs --confirm${colors.reset}\n`);
        process.exit(0);
    }
    
    console.log(`${colors.yellow}🚀 Iniciando limpieza...${colors.reset}\n`);
    
    // 3. Limpiar en orden correcto (items primero por foreign keys)
    const results = [];
    
    // Items primero
    results.push(await cleanTable('factura_items', 'Items de Facturas'));
    results.push(await cleanTable('pedido_items', 'Items de Pedidos'));
    
    // Luego las tablas principales
    results.push(await cleanTable('facturas', 'Facturas'));
    results.push(await cleanTable('pedidos', 'Pedidos'));
    
    // 4. Verificación final
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICACIÓN FINAL');
    console.log('='.repeat(60) + '\n');
    
    const finalCounts = await countRecords();
    const allClean = Object.values(finalCounts).every(count => count === 0);
    
    if (allClean) {
        console.log(`${colors.green}✅ Limpieza completada exitosamente${colors.reset}\n`);
        console.log('📝 Resumen:');
        console.log('   - Facturas eliminadas');
        console.log('   - Items de facturas eliminados');
        console.log('   - Pedidos eliminados');
        console.log('   - Items de pedidos eliminados');
        console.log('\n✨ La base de datos está lista para nuevos registros\n');
    } else {
        console.log(`${colors.yellow}⚠️  Algunos registros no pudieron eliminarse${colors.reset}\n`);
        console.log('Posibles causas:');
        console.log('   - Foreign keys que impiden la eliminación');
        console.log('   - Permisos insuficientes');
        console.log('   - Tablas no existen en el esquema\n');
    }
}

// Ejecutar
cleanDatabase().catch(error => {
    console.error(`${colors.red}❌ Error inesperado:${colors.reset}`, error);
    process.exit(1);
});
