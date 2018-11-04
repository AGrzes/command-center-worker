import * as express from 'express'
import github from './github'
import jira from './jira'
const app = express()

app.use('/jira', jira)
app.use('/github', github)

app.listen(3000)
