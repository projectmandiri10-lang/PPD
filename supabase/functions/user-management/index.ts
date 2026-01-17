
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with Service Role Key (for admin actions)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse request body
        const { action, data } = await req.json()

        // 1. Verify Request: Check if caller is authenticated
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Invalid token')
        }

        // 2. Verify Role: Check if caller is an admin
        const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (userRole?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required')
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

            // Delete from Auth
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id)

            if (deleteError) throw deleteError

            // Also ensure deleted from user_roles (redundancy if no cascade)
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
