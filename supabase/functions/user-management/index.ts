
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!supabaseKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
            throw new Error('Server misconfiguration: Missing Service Key')
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const body = await req.json()
        const { action, data } = body
        console.log(`Action: ${action}`)

        // 1. Verify Request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('Missing Auth Header')
            throw new Error('Missing Authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            console.error('Invalid token:', userError)
            throw new Error('Invalid token')
        }

        console.log(`User ID: ${user.id}`)

        // 2. Verify Role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (roleError) {
            console.error('Role check failed:', roleError)
        }

        console.log(`User Role: ${roleData?.role}`)

        if (roleData?.role !== 'admin') {
            // DEBUG MODE: Return detail instead of throwing 401 directly
            // This helps us see what the server sees.
            return new Response(JSON.stringify({
                error: 'Unauthorized: Admin access required',
                debug: {
                    user_id: user.id,
                    email: user.email,
                    role_found: roleData?.role || 'null',
                    role_error: roleError ? roleError.message : 'none'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403, // Using 403 Forbidden instead of 401 to differentiate
            })
        }

        // 3. Handle Actions

        // ACTION: create_operator
        // Creates a new user in Supabase Auth and adds to user_roles table
        if (action === 'create_operator') {
            const { email, password } = data

            if (!email || !password) throw new Error('Email and password required')

            // Create user in Auth
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto confirm
                user_metadata: { role: 'operator' }
            })

            if (createError) throw createError

            // Add to user_roles table
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: newUser.user.id,
                    email: email,
                    role: 'operator'
                })

            if (roleError) {
                // If role creation fails, try to cleanup the user (optional but good practice)
                await supabase.auth.admin.deleteUser(newUser.user.id)
                throw new Error('Failed to assign role: ' + roleError.message)
            }

            return new Response(JSON.stringify({
                message: 'Operator created successfully',
                data: { id: newUser.user.id, email: newUser.user.email }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // ACTION: list_operators
        // Lists all users with role 'operator' from user_roles table
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
