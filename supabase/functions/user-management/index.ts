// @ts-ignore: Deno types
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*', // Allow all headers
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!supabaseKey) {
            throw new Error('Server misconfiguration: Missing Service Key')
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        let body;
        try {
            body = await req.json()
        } catch (e) {
            throw new Error('Invalid JSON body')
        }

        const { action, data } = body
        console.log('[DEBUG] Action:', action)

        // 1. Verify Request
        const authHeader = req.headers.get('Authorization')
        console.log('[DEBUG] Auth header present:', !!authHeader)

        if (!authHeader) {
            console.error('[ERROR] Missing Authorization header')
            throw new Error('Missing Authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        console.log('[DEBUG] Token length:', token.length)

        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError) {
            console.error('[ERROR] Auth error:', userError.message)
            throw new Error('Invalid token: ' + userError.message)
        }

        if (!user) {
            console.error('[ERROR] No user returned from auth')
            throw new Error('Invalid token: No user')
        }

        console.log('[DEBUG] User authenticated:', user.id, user.email)

        // 2. Verify Role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        console.log('[DEBUG] Role data:', roleData, 'Error:', roleError)

        // If user not in user_roles, treat as unauthorized for admin actions
        if (!roleData || roleData.role !== 'admin') {
            console.warn('[WARN] User not admin. Role:', roleData?.role, 'User:', user.email)
            return new Response(JSON.stringify({
                error: 'Unauthorized: Admin access required',
                debug: {
                    user_id: user.id,
                    email: user.email,
                    role_found: roleData?.role || null
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        console.log('[DEBUG] Admin verified, proceeding with action:', action)

        // 3. Handle Actions
        if (action === 'create_operator') {
            const { email, password } = data
            if (!email || !password) throw new Error('Email and password required')

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role: 'operator' }
            })

            if (createError) throw createError

            const { error: roleInsertError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: newUser.user.id,
                    email: email,
                    role: 'operator'
                })

            if (roleInsertError) {
                await supabase.auth.admin.deleteUser(newUser.user.id) // Rollback
                throw new Error('Failed to assign role: ' + roleInsertError.message)
            }

            return new Response(JSON.stringify({
                message: 'Operator created successfully',
                data: { id: newUser.user.id, email: newUser.user.email }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'list_operators') {
            const { data: operators, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('role', 'operator')
                .order('created_at', { ascending: false })

            if (error) throw error

            return new Response(JSON.stringify({ data: operators }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // ACTION: delete_operator
        // Deletes user from Auth (and cascades to user_roles if configured, or manual delete)
        if (action === 'delete_operator') {
            const { user_id } = data

            if (!user_id) throw new Error('User ID required')

            // Delete from Auth (Soft fail: if user not found, proceed to delete role)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id)

            if (deleteError) {
                console.warn(`Failed to delete auth user ${user_id} (might be already deleted):`, deleteError.message)
            }

            // Also ensure deleted from user_roles
            await supabase.from('user_roles').delete().eq('user_id', user_id)

            return new Response(JSON.stringify({ message: 'Operator deleted successfully' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error(`Unknown action: ${action}`)

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
