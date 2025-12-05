/**
 * Find Teelixir Supabase project and get credentials
 */

import { supabaseAPI } from '../../shared/libs/supabase';

async function findTeelixirProject() {
  console.log('🔍 Searching for Teelixir Supabase project...\n');

  try {
    // Get all projects
    const projects = await supabaseAPI.getProjects();

    console.log(`Found ${projects.length} projects:\n`);

    projects.forEach((project: any) => {
      console.log(`- ${project.name || project.id} (${project.ref || project.id})`);
    });

    // Find Teelixir project
    const teelixirProject = projects.find((p: any) =>
      (p.name && p.name.toLowerCase().includes('teelixir')) ||
      (p.ref && p.ref.toLowerCase().includes('teelixir'))
    );

    if (!teelixirProject) {
      console.log('\n⚠️  Could not find a project with "teelixir" in the name.');
      console.log('Available projects:', projects.map((p: any) => p.name || p.ref).join(', '));
      return null;
    }

    console.log(`\n✅ Found Teelixir project: ${teelixirProject.name || teelixirProject.ref}\n`);

    // Get project details
    const projectRef = teelixirProject.ref || teelixirProject.id;
    const projectDetails = await supabaseAPI.getProject(projectRef);

    console.log('Project Details:', {
      id: projectDetails.id || projectDetails.ref,
      name: projectDetails.name,
      region: projectDetails.region,
      created_at: projectDetails.created_at,
    });
    console.log();

    // Get API keys
    console.log('Getting API keys...');
    const apiKeys = await supabaseAPI.getProjectAPIKeys(projectRef);

    console.log('\n📋 Project Configuration:\n');
    console.log(`SUPABASE_URL=https://${projectRef}.supabase.co`);
    console.log(`SUPABASE_ANON_KEY=${apiKeys.anon || apiKeys.anon_key}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY=${apiKeys.service_role || apiKeys.service_role_key}`);
    console.log();

    return {
      ref: projectRef,
      url: `https://${projectRef}.supabase.co`,
      anonKey: apiKeys.anon || apiKeys.anon_key,
      serviceRoleKey: apiKeys.service_role || apiKeys.service_role_key,
    };

  } catch (error) {
    console.error('❌ Error finding Teelixir project:', error);

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.error('\n💡 The SUPABASE_ACCESS_TOKEN may be invalid or expired.');
        console.error('   Get a new token from: https://supabase.com/dashboard/account/tokens\n');
      }
    }

    throw error;
  }
}

findTeelixirProject()
  .then(config => {
    if (config) {
      console.log('✨ Found project configuration!');
      console.log('\nCopy these values to your .env file to connect to the database.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to find project');
    process.exit(1);
  });
