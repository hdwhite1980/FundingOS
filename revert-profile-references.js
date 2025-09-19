// Revert all profiles table references back to user_profiles
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, oldText, newText) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(new RegExp(oldText, 'g'), newText);
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      const matches = (content.match(new RegExp(oldText, 'g')) || []).length;
      console.log(`✅ Updated ${filePath}: ${matches} replacements`);
      return matches;
    }
    return 0;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return 0;
  }
}

function revertProfileReferences() {
  console.log('🔄 Reverting profile table references back to user_profiles...\n');
  
  let totalReplacements = 0;
  
  // Files that need to be reverted
  const filesToUpdate = [
    'lib/supabase.js'
  ];
  
  filesToUpdate.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const replacements = replaceInFile(filePath, "\\.from\\('profiles'\\)", ".from('user_profiles')");
      totalReplacements += replacements;
    } else {
      console.log(`⚠️ File not found: ${file}`);
    }
  });
  
  console.log(`\n📊 Summary: ${totalReplacements} total replacements made`);
  
  if (totalReplacements > 0) {
    console.log('\n✅ Profile table references reverted successfully!');
    console.log('🎯 Your company settings should now be restored.');
    console.log('💡 Next: Test login to verify data access.');
  } else {
    console.log('\n⚠️ No replacements needed or files already correct.');
  }
}

revertProfileReferences();