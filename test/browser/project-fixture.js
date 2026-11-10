export async function createProject(page,title='Minha nova aula') {
  await page.locator('.create-half').click();
  await page.getByLabel('Título da aula',{exact:true}).fill(title);
  await page.getByRole('button',{name:'Criar aula',exact:true}).click();
}
