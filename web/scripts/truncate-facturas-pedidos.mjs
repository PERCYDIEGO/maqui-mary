#!/usr/bin/env node
/**
 * Script rápido para truncar (vaciar) tablas de facturas y pedidos
 * Más rápido que DELETE pero requiere desactivar foreign keys
 * 
 * Uso:
 *   node scripts/truncate-facturas-pedidos.mjs --confirm
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

async function truncateTables() {
    console.log('\n' + '='.repeat(60));
    console.log('🗑️  TRUNCATE - Vaciando tablas de facturas y pedidos');
    console.log('='.repeat(60) + '\n');
    
    // Verificar argumentos
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm') || args.includes('-y');
    
    if (!confirmed) {
        console.log(`${colors.red}⚠️  ADVERTENCIA:${colors.reset}`);
        console.log('   Este script vaciará completamente las siguientes tablas:');
        console.log('   - facturas');
        console.log('   - factura_items');
        console.log('   - facturas_pendientes (si existe)');
        console.log('   - pedidos');
        console.log('   - pedido_items\n');
        console.log(`${colors.yellow}   Los datos NO podrán recuperarse${colors.reset}\n`);
        console.log('   Para ejecutar:');
        console.log(`   ${colors.blue}node scripts/truncate-facturas-pedidos.mjs --confirm${colors.reset}\n`);
        process.exit(0);
    }
    
    // Mostrar conteo actual
    console.log('📊 Registros actuales:\n');
    
    const tables = [
        'facturas',
        'factura_items', 
        'pedidos',
        'pedido_items'
    ];
    
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`${colors.yellow}⚠️  ${table}:${colors.reset} ${error.message}`);
        } else {
            console.log(`   ${table}: ${count} registros`);
        }
    }
    
    console.log(`\n${colors.yellow}🚀 Procediendo con el truncate...${colors.reset}\n`);
    
    // Ejecutar TRUNCATE usando RPC (función almacenada)
    // Nota: Esto requiere que exista una función en Supabase o usar REST API directo
    
    // Alternativa: Usar DELETE con cascade (más lento pero funciona sin RPC)
    console.log(`${colors.blue}🧹 Eliminando registros...${colors.reset}\n`);
    
    // Orden importante: primero items, luego padres
    const deleteOrder = [
        { table: 'factura_items', label: 'Items de Facturas' },
        { table: 'pedido_items', label: 'Items de Pedidos' },
        { table: 'facturas_pendientes', label: 'Facturas Pendientes' },
        { table: 'facturas', label: 'Facturas' },
        { table: 'pedidos', label: 'Pedidos' }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const { table, label } of deleteOrder) {
        try {
            // Intentar eliminar todos los registros
            const { error } = await supabase
                .from(table)
                .delete()
                .gte('id', 0); // Condición que se cumple para todos
            
            if (error) {
                // Si la tabla no existe o hay error de foreign key, intentar con neq
                const { error: error2 } = await supabase
                    .from(table)
                    .delete()
                    .neq('id', -999999); // ID que no existe
                
                if (error2 && !error2.message.includes('does not exist')) {
                    throw error2;
                }
            }
            
            // Verificar
            const { count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (count === 0) {
                console.log(`${colors.green}✅ ${label} - Vaciado${colors.reset}`);
                successCount++;
            } else {
                console.log(`${colors.yellow}⚠️  ${label} - ${count} registros restantes${colors.reset}`);
            }
            
        } catch (error) {
            if (error.message && error.message.includes('does not exist')) {
                console.log(`${colors.blue}ℹ️  ${label} - Tabla no existe (ignorado)${colors.reset}`);
            } else {
                console.error(`${colors.red}❌ ${label} - Error:${colors.reset} ${error.message}`);
                errorCount++;
            }
        }
    }
    
    // Resultado final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO');
    console.log('='.repeat(60) + '\n');
    
    console.log(`${colors.green}✅ Tablas procesadas: ${successCount}${colors.reset}`);
    if (errorCount > 0) {
        console.log(`${colors.red}❌ Errores: ${errorCount}${colors.reset}`);
    }
    
    // Verificación final
    console.log('\n📋 Verificación:\n');
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            const status = count === 0 ? colors.green : colors.yellow;
            console.log(`   ${status}${table}: ${count} registros${colors.reset}`);
        }
    }
    
    console.log(`\n${colors.green}✨ Proceso completado${colors.reset}\n`);
}

// Ejecutar
truncateTables().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});
