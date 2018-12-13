import * as express from 'express'
import './exercise'
import github from './github'
import jira from './jira'
import './sync'
const app = express()

app.use('/jira', jira)
app.use('/github', github)

app.listen(3000)
