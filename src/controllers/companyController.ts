import { Request, Response } from 'express'
import jsonwebtoken = require('jsonwebtoken')

import { Company, ICompany } from '../models/Company'
import { jwtOptions } from '../config/jwt'

export class CompanysController {
  public addNewCompany (req: Request, res: Response) {
    const newCompany = new Company(req.body)

    newCompany.save((err, company) => {
      if (err) {
        console.log('saving company failed:', err.message)
        if (err.name === 'ValidationError') {
          res.status(400).send(err.message)
          return
        }
        res.status(500).send(err)
        return
      }

      res.status(201).json(company)
    })
  }

  public getCompanies (_: Request, res: Response) {
    Company.find({}, (err, company) => {
      if (err) {
        res.send(err)
      }
      res.json(company)
    })
  }

  public getCompanyByID (req: Request, res: Response) {
    Company.findById(req.params.companyId, (err, company) => {
      if (err) {
        res.send(err)
        return
      }

      if (!company) {
        res.status(404).send(`company not found: ${req.params.companyId}`)
        return
      }

      res.json(company)
    })
  }

  public updateCompany (req: Request, res: Response) {
    Company.findOneAndUpdate({ _id: req.params.companyId }, req.body, { new: true }, (err, company) => {
      if (err) {
        res.send(err)
      }
      res.json(company)
    })
  }

  public deleteCompany (req: Request, res: Response) {
    Company.deleteOne({ _id: req.params.companyId }, (err) => {
      if (err) {
        res.send(err)
      }
      res.json({ message: 'Successfully deleted company!'})
    })
  }
}
