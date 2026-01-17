import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase client with service role for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Create client with user's token for regular operations
        const authHeader = req.headers.get('Authorization');
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: authHeader ? { Authorization: authHeader } : {},
                },
            }
        );

        const { action, data } = await req.json();

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // Get user role
        const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (roleError || !roleData) {
            return new Response(
                JSON.stringify({ error: 'User role not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        const userRole = roleData.role;

        // Handle different actions
        switch (action) {
            case 'create_operator': {
                // Only admins can create operators
                if (userRole !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can create operators' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
                    );
                }

                const { email, password } = data;

                // Create user with admin client
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true, // Auto-confirm email
                });

                if (createError) {
                    return new Response(
                        JSON.stringify({ error: createError.message }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    );
                }

                // Insert role
                const { error: roleInsertError } = await supabaseAdmin
                    .from('user_roles')
                    .insert({
                        user_id: newUser.user.id,
                        email: email,
                        role: 'operator'
                    });

                if (roleInsertError) {
                    // Rollback: delete user if role insert fails
                    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                    return new Response(
                        JSON.stringify({ error: roleInsertError.message }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    );
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        user: {
                            id: newUser.user.id,
                            email: newUser.user.email,
                            role: 'operator'
                        }
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'list_operators': {
                // Only admins can list operators
                if (userRole !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can list operators' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
                    );
                }

                const { data: operators, error: listError } = await supabaseClient
                    .from('user_roles')
                    .select('id, email, role, created_at')
                    .eq('role', 'operator')
                    .order('created_at', { ascending: false });

                if (listError) {
                    return new Response(
                        JSON.stringify({ error: listError.message }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    );
                }

                return new Response(
                    JSON.stringify({ operators }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'delete_operator': {
                // Only admins can delete operators
                if (userRole !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can delete operators' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
                    );
                }

                const { userId } = data;

                // Delete user (will cascade delete role due to ON DELETE CASCADE)
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                if (deleteError) {
                    return new Response(
                        JSON.stringify({ error: deleteError.message }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    );
                }

                return new Response(
                    JSON.stringify({ success: true }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            default:
                return new Response(
                    JSON.stringify({ error: 'Invalid action' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
        }

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
